import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { cleanEmail, cleanId, cleanPermission, cleanShareDays } from './validate.js';
import { REGION, FieldValue, Timestamp, audit, auth, db, guarded, rateLimit, requireVerified } from './runtime.js';

const shareId = (docId, uid) => `${docId}_${uid}`;

export const shareDocument = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const data = request.data || {};
  const docId = cleanId(data.docId, 'Document id');
  const email = cleanEmail(data.email);
  const permission = cleanPermission(data.permission);
  const days = cleanShareDays(data.days);

  await rateLimit(user.uid, 'share', { limit: 40, windowSeconds: 3600 });

  if (email === user.email) throw new HttpsError('invalid-argument', 'You already own this document.');

  const docRef = db.collection('documents').doc(docId);
  const snap = await docRef.get();
  if (!snap.exists || snap.data().ownerId !== user.uid) throw new HttpsError('not-found', 'Document not found.');

  let recipient;
  try {
    recipient = await auth.getUserByEmail(email);
  } catch {
    throw new HttpsError('not-found', 'No verified Vaultara account uses that email. Ask them to register first.');
  }
  if (!recipient.emailVerified) {
    throw new HttpsError('failed-precondition', 'That person has not verified their email yet.');
  }

  const expiresAt = days ? Timestamp.fromMillis(Date.now() + days * 86400000) : null;
  const batch = db.batch();
  batch.set(db.collection('shares').doc(shareId(docId, recipient.uid)), {
    docId,
    docTitle: snap.data().title,
    ownerId: user.uid,
    ownerEmail: user.email,
    recipientUid: recipient.uid,
    recipientEmail: email,
    permission,
    expiresAt,
    createdAt: FieldValue.serverTimestamp()
  });
  batch.update(docRef, { sharedWithUids: FieldValue.arrayUnion(recipient.uid), updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();

  await audit({
    actor: user, action: 'share.create', ownerId: user.uid, docId, docTitle: snap.data().title,
    detail: `${email}, ${permission}${days ? `, ${days} days` : ''}`, rawRequest: request.rawRequest
  });
  return { ok: true };
}));

// The owner can revoke any share. A recipient can drop a share addressed to them.
export const revokeShare = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const id = String(request.data?.shareId || '');
  if (!/^[A-Za-z0-9_-]{20,40}_[A-Za-z0-9]{20,40}$/.test(id)) throw new HttpsError('invalid-argument', 'Share id is invalid.');

  const ref = db.collection('shares').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Share not found.');
  const share = snap.data();
  if (share.ownerId !== user.uid && share.recipientUid !== user.uid) throw new HttpsError('not-found', 'Share not found.');

  const batch = db.batch();
  batch.delete(ref);
  batch.update(db.collection('documents').doc(share.docId), {
    sharedWithUids: FieldValue.arrayRemove(share.recipientUid),
    updatedAt: FieldValue.serverTimestamp()
  });
  await batch.commit();

  await audit({
    actor: user, action: share.ownerId === user.uid ? 'share.revoke' : 'share.leave', ownerId: share.ownerId,
    docId: share.docId, docTitle: share.docTitle, detail: share.recipientEmail, rawRequest: request.rawRequest
  });
  return { ok: true };
}));
