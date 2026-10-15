import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { purgeDocument } from './documents.js';
import { removeMember } from './family.js';
import {
  REGION, FieldValue, audit, auth, db, guarded, rateLimit, requireRecentLogin, requireVerified
} from './runtime.js';

const iso = (value) => (value && typeof value.toDate === 'function' ? value.toDate().toISOString() : value ?? null);

// Called by the browser after every sign in or registration. Creates the
// profile on first use and records the event in the audit trail.
export const recordSession = onCall({ region: REGION }, guarded(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  const uid = request.auth.uid;
  const email = String(request.auth.token.email || '').toLowerCase();
  const event = request.data?.event === 'register' ? 'register' : 'login';
  await rateLimit(uid, 'session', { limit: 60, windowSeconds: 3600 });

  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    // The ID token may predate the name being set, so ask Auth directly.
    const record = await auth.getUser(uid);
    await ref.set({
      email,
      displayName: String(record.displayName || email.split('@')[0]).replace(/[\u0000-\u001f]/g, '').slice(0, 80),
      theme: 'system',
      familyId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  await audit({
    actor: { uid, email }, action: event === 'register' && !snap.exists ? 'account.register' : 'account.login',
    ownerId: uid, detail: request.auth.token.firebase?.sign_in_provider || null, rawRequest: request.rawRequest
  });
  return { profileCreated: !snap.exists };
}));

export const exportMyData = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  await rateLimit(user.uid, 'export', { limit: 5, windowSeconds: 3600 });

  const [profile, owned, sharesOut, sharesIn, logs] = await Promise.all([
    db.collection('users').doc(user.uid).get(),
    db.collection('documents').where('ownerId', '==', user.uid).get(),
    db.collection('shares').where('ownerId', '==', user.uid).get(),
    db.collection('shares').where('recipientUid', '==', user.uid).get(),
    db.collection('auditLogs').where('subjects', 'array-contains', user.uid).orderBy('createdAt', 'desc').limit(500).get()
  ]);
  const plain = (d) => Object.fromEntries(Object.entries(d.data()).map(([k, v]) => [k, iso(v)]));
  await audit({ actor: user, action: 'account.export', ownerId: user.uid, rawRequest: request.rawRequest });
  return {
    exportedAt: new Date().toISOString(),
    profile: profile.exists ? plain(profile) : null,
    documents: owned.docs.map((d) => ({ id: d.id, ...plain(d) })),
    sharesCreated: sharesOut.docs.map((d) => ({ id: d.id, ...plain(d) })),
    sharesReceived: sharesIn.docs.map((d) => ({ id: d.id, ...plain(d) })),
    activity: logs.docs.map((d) => ({ id: d.id, ...plain(d) })),
    note: 'File contents are not included. Download each document from the vault.'
  };
}));

export const deleteMyAccount = onCall({ region: REGION, timeoutSeconds: 300, memory: '512MiB' }, guarded(async (request) => {
  const user = requireVerified(request);
  requireRecentLogin(user.token);
  if (request.data?.confirm !== 'DELETE') throw new HttpsError('invalid-argument', 'Type DELETE to confirm.');

  const profileSnap = await db.collection('users').doc(user.uid).get();
  const familyId = profileSnap.exists ? profileSnap.data().familyId : null;
  if (familyId) {
    const family = await db.collection('families').doc(familyId).get();
    if (family.exists && family.data().ownerId === user.uid && family.data().memberUids.length > 1) {
      throw new HttpsError('failed-precondition', 'Disband your family or remove its members before deleting your account.');
    }
    await removeMember(familyId, user.uid);
    if (family.exists && family.data().ownerId === user.uid) await db.collection('families').doc(familyId).delete();
  }

  const owned = await db.collection('documents').where('ownerId', '==', user.uid).get();
  for (const d of owned.docs) await purgeDocument(d.id, user.uid);

  const received = await db.collection('shares').where('recipientUid', '==', user.uid).get();
  for (const s of received.docs) {
    await db.collection('documents').doc(s.data().docId).update({ sharedWithUids: FieldValue.arrayRemove(user.uid) }).catch(() => {});
    await s.ref.delete();
  }

  const logs = await db.collection('auditLogs').where('actorId', '==', user.uid).get();
  for (let i = 0; i < logs.docs.length; i += 400) {
    const batch = db.batch();
    logs.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await db.collection('users').doc(user.uid).delete();
  await auth.deleteUser(user.uid);
  return { ok: true };
}));
