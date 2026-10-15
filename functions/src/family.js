import { randomBytes, randomInt } from 'node:crypto';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { cleanId, cleanInviteCode, cleanText } from './validate.js';
import {
  REGION, FieldValue, Timestamp, audit, db, guarded, rateLimit, requireVerified, setFamilyClaim
} from './runtime.js';

const MAX_MEMBERS = 8;
const MAX_OPEN_INVITES = 5;
const INVITE_HOURS = 48;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0, O, 1, I

export const newInviteCode = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const newFamilyId = () => randomBytes(15).toString('base64url');

const displayName = async (uid, fallbackEmail) => {
  const snap = await db.collection('users').doc(uid).get();
  return (snap.exists && snap.data().displayName) || fallbackEmail?.split('@')[0] || 'Member';
};

// Switch off family visibility on a user's documents when they leave.
async function detachDocuments(uid) {
  const snap = await db.collection('documents').where('ownerId', '==', uid).where('familyShared', '==', true).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { familyShared: false, familyId: null }));
    await batch.commit();
  }
}

export async function removeMember(familyId, uid) {
  const ref = db.collection('families').doc(familyId);
  await ref.update({
    memberUids: FieldValue.arrayRemove(uid),
    [`members.${uid}`]: FieldValue.delete()
  });
  await db.collection('users').doc(uid).set({ familyId: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await setFamilyClaim(uid, null);
  await detachDocuments(uid);
}

async function loadMyFamily(uid) {
  const profile = await db.collection('users').doc(uid).get();
  const familyId = profile.exists ? profile.data().familyId : null;
  if (!familyId) throw new HttpsError('failed-precondition', 'You are not in a family yet.');
  const family = await db.collection('families').doc(familyId).get();
  if (!family.exists) throw new HttpsError('failed-precondition', 'Your family no longer exists.');
  return { familyId, family: family.data() };
}

export const createFamily = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const name = cleanText(request.data?.name, { max: 60, field: 'Family name' });
  const profile = await db.collection('users').doc(user.uid).get();
  if (profile.exists && profile.data().familyId) throw new HttpsError('failed-precondition', 'Leave your current family first.');

  const familyId = newFamilyId();
  const myName = await displayName(user.uid, user.email);
  await db.collection('families').doc(familyId).set({
    name,
    ownerId: user.uid,
    memberUids: [user.uid],
    members: { [user.uid]: { name: myName, email: user.email, role: 'owner', joinedAt: Timestamp.now() } },
    createdAt: FieldValue.serverTimestamp()
  });
  await db.collection('users').doc(user.uid).set({ familyId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await setFamilyClaim(user.uid, familyId);
  await audit({ actor: user, action: 'family.create', ownerId: user.uid, detail: name, rawRequest: request.rawRequest });
  return { familyId };
}));

export const createInvite = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const { familyId, family } = await loadMyFamily(user.uid);
  if (family.ownerId !== user.uid) throw new HttpsError('permission-denied', 'Only the family owner can invite people.');
  if (family.memberUids.length >= MAX_MEMBERS) throw new HttpsError('failed-precondition', `A family can have at most ${MAX_MEMBERS} members.`);
  await rateLimit(user.uid, 'invite', { limit: 20, windowSeconds: 3600 });

  const open = await db.collection('familyInvites').where('createdBy', '==', user.uid).where('used', '==', false).get();
  const live = open.docs.filter((d) => d.data().expiresAt.toMillis() > Date.now());
  if (live.length >= MAX_OPEN_INVITES) throw new HttpsError('resource-exhausted', 'Revoke an existing invite before creating another.');

  const code = newInviteCode();
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_HOURS * 3600000);
  await db.collection('familyInvites').doc(code).set({
    familyId, createdBy: user.uid, used: false, expiresAt, createdAt: FieldValue.serverTimestamp()
  });
  await audit({ actor: user, action: 'family.invite', ownerId: user.uid, rawRequest: request.rawRequest });
  return { code, expiresAt: expiresAt.toMillis() };
}));

export const revokeInvite = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const code = cleanInviteCode(request.data?.code);
  const ref = db.collection('familyInvites').doc(code);
  const snap = await ref.get();
  if (!snap.exists || snap.data().createdBy !== user.uid) throw new HttpsError('not-found', 'Invite not found.');
  await ref.delete();
  return { ok: true };
}));

export const joinFamily = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  // Codes are 32^8 values, and five guesses an hour keeps brute force hopeless.
  await rateLimit(user.uid, 'joinFamily', { limit: 5, windowSeconds: 3600 });
  const code = cleanInviteCode(request.data?.code);
  const myName = await displayName(user.uid, user.email);

  const familyId = await db.runTransaction(async (tx) => {
    const profileRef = db.collection('users').doc(user.uid);
    const inviteRef = db.collection('familyInvites').doc(code);
    const [profile, invite] = await Promise.all([tx.get(profileRef), tx.get(inviteRef)]);

    if (profile.exists && profile.data().familyId) throw new HttpsError('failed-precondition', 'Leave your current family first.');
    const data = invite.exists ? invite.data() : null;
    if (!data || data.used || data.expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError('not-found', 'That invite code is not valid or has expired.');
    }
    const familyRef = db.collection('families').doc(data.familyId);
    const family = await tx.get(familyRef);
    if (!family.exists) throw new HttpsError('not-found', 'That family no longer exists.');
    if (family.data().memberUids.length >= MAX_MEMBERS) throw new HttpsError('failed-precondition', 'That family is full.');

    tx.update(familyRef, {
      memberUids: FieldValue.arrayUnion(user.uid),
      [`members.${user.uid}`]: { name: myName, email: user.email, role: 'member', joinedAt: Timestamp.now() }
    });
    tx.update(inviteRef, { used: true, usedBy: user.uid });
    tx.set(profileRef, { familyId: data.familyId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return data.familyId;
  });

  await setFamilyClaim(user.uid, familyId);
  await audit({ actor: user, action: 'family.join', ownerId: user.uid, rawRequest: request.rawRequest });
  return { familyId };
}));

export const leaveFamily = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const { familyId, family } = await loadMyFamily(user.uid);
  if (family.ownerId === user.uid && family.memberUids.length > 1) {
    throw new HttpsError('failed-precondition', 'Remove the other members or disband the family first.');
  }
  if (family.ownerId === user.uid) {
    await removeMember(familyId, user.uid);
    await db.collection('families').doc(familyId).delete();
  } else {
    await removeMember(familyId, user.uid);
  }
  await audit({ actor: user, action: 'family.leave', ownerId: user.uid, rawRequest: request.rawRequest });
  return { ok: true };
}));

export const removeFamilyMember = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const target = cleanId(request.data?.uid, 'Member id');
  const { familyId, family } = await loadMyFamily(user.uid);
  if (family.ownerId !== user.uid) throw new HttpsError('permission-denied', 'Only the family owner can remove members.');
  if (target === user.uid || !family.memberUids.includes(target)) throw new HttpsError('invalid-argument', 'That person is not a removable member.');
  await removeMember(familyId, target);
  await audit({ actor: user, action: 'family.remove', ownerId: user.uid, detail: family.members?.[target]?.email, rawRequest: request.rawRequest });
  return { ok: true };
}));

export const disbandFamily = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const { familyId, family } = await loadMyFamily(user.uid);
  if (family.ownerId !== user.uid) throw new HttpsError('permission-denied', 'Only the family owner can disband it.');
  for (const uid of family.memberUids) await removeMember(familyId, uid);
  await db.collection('families').doc(familyId).delete();
  const invites = await db.collection('familyInvites').where('familyId', '==', familyId).get();
  await Promise.all(invites.docs.map((d) => d.ref.delete()));
  await audit({ actor: user, action: 'family.disband', ownerId: user.uid, rawRequest: request.rawRequest });
  return { ok: true };
}));
