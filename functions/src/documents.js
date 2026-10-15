import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { decryptFile, encryptFile, sha256Hex } from './crypto.js';
import { sniffMime, ALLOWED_TYPES } from './sniff.js';
import { accessFor } from './access.js';
import {
  ValidationError, cleanCategory, cleanExpiryDate, cleanId, cleanTags, cleanText, safeFileName, MAX_FILE_BYTES
} from './validate.js';
import {
  REGION, VAULT_MASTER_KEY, FieldValue, Timestamp, audit, auth, bucket, db, guarded, inboxPath,
  masterKey, rateLimit, requireVerified, vaultPath
} from './runtime.js';

const callable = { region: REGION, secrets: [VAULT_MASTER_KEY], memory: '1GiB', timeoutSeconds: 120 };

async function getProfile(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? snap.data() : {};
}

// Step 2 of an upload. The browser already dropped the file in
// inbox/{uid}/{uploadId}. Validate it, encrypt it, store the ciphertext,
// record the metadata, and delete the plaintext inbox copy.
export const finalizeUpload = onCall(callable, guarded(async (request) => {
  const user = requireVerified(request);
  const data = request.data || {};
  const docId = cleanId(data.uploadId, 'Upload id');
  const title = cleanText(data.title, { max: 100, field: 'Title' });
  const category = cleanCategory(data.category);
  const tags = cleanTags(data.tags);
  const expiry = cleanExpiryDate(data.expiresOn);

  await rateLimit(user.uid, 'upload', { limit: 30, windowSeconds: 3600 });

  const inbox = bucket().file(inboxPath(user.uid, docId));
  const discard = () => inbox.delete({ ignoreNotFound: true }).catch(() => {});

  const [exists] = await inbox.exists();
  if (!exists) throw new HttpsError('not-found', 'The upload did not arrive. Please try again.');

  const [meta] = await inbox.getMetadata();
  if (Number(meta.size) > MAX_FILE_BYTES) {
    await discard();
    throw new HttpsError('invalid-argument', 'That file is larger than 15MB.');
  }

  const [plaintext] = await inbox.download();
  const mimeType = sniffMime(plaintext);
  if (!mimeType) {
    await discard();
    throw new HttpsError('invalid-argument', 'Only PDF, JPEG, PNG, WebP and HEIC files are accepted.');
  }

  const docRef = db.collection('documents').doc(docId);
  if ((await docRef.get()).exists) {
    await discard();
    throw new HttpsError('already-exists', 'This upload was already processed.');
  }

  const profile = await getProfile(user.uid);
  const familyShared = data.familyShared === true && !!profile.familyId;
  const { ciphertext, wrappedKey } = encryptFile(plaintext, { docId, ownerId: user.uid, masterKey: masterKey() });

  await bucket().file(vaultPath(user.uid, docId)).save(ciphertext, {
    resumable: false,
    contentType: 'application/octet-stream',
    metadata: { cacheControl: 'no-store' }
  });

  const batch = db.batch();
  batch.set(docRef, {
    ownerId: user.uid,
    title,
    category,
    tags,
    mimeType,
    extension: ALLOWED_TYPES[mimeType],
    size: plaintext.length,
    sha256: sha256Hex(plaintext),
    expiresAt: expiry ? Timestamp.fromDate(expiry) : null,
    familyId: profile.familyId || null,
    familyShared,
    sharedWithUids: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  batch.set(db.collection('docKeys').doc(docId), { wrappedKey, version: 1, ownerId: user.uid });
  await batch.commit();
  await discard();

  await audit({ actor: user, action: 'document.upload', ownerId: user.uid, docId, docTitle: title, detail: `${category}, ${plaintext.length} bytes`, rawRequest: request.rawRequest });
  return { id: docId };
}));

export const updateDocument = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const data = request.data || {};
  const docId = cleanId(data.docId, 'Document id');
  const ref = db.collection('documents').doc(docId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().ownerId !== user.uid) throw new HttpsError('not-found', 'Document not found.');

  const patch = { updatedAt: FieldValue.serverTimestamp() };
  if ('title' in data) patch.title = cleanText(data.title, { max: 100, field: 'Title' });
  if ('category' in data) patch.category = cleanCategory(data.category);
  if ('tags' in data) patch.tags = cleanTags(data.tags);
  if ('expiresOn' in data) {
    const expiry = cleanExpiryDate(data.expiresOn);
    patch.expiresAt = expiry ? Timestamp.fromDate(expiry) : null;
  }
  if ('familyShared' in data) {
    const profile = await getProfile(user.uid);
    if (data.familyShared === true && !profile.familyId) {
      throw new HttpsError('failed-precondition', 'Join or create a family before sharing with it.');
    }
    patch.familyShared = data.familyShared === true;
    patch.familyId = profile.familyId || null;
  }
  await ref.update(patch);
  await audit({ actor: user, action: 'document.update', ownerId: user.uid, docId, docTitle: patch.title || snap.data().title, rawRequest: request.rawRequest });
  return { ok: true };
}));

export async function purgeDocument(docId, ownerId) {
  const sharesSnap = await db.collection('shares').where('docId', '==', docId).get();
  const batch = db.batch();
  sharesSnap.forEach((s) => batch.delete(s.ref));
  batch.delete(db.collection('docKeys').doc(docId));
  batch.delete(db.collection('documents').doc(docId));
  await bucket().file(vaultPath(ownerId, docId)).delete({ ignoreNotFound: true });
  await batch.commit();
}

export const deleteDocument = onCall({ region: REGION }, guarded(async (request) => {
  const user = requireVerified(request);
  const docId = cleanId(request.data?.docId, 'Document id');
  const snap = await db.collection('documents').doc(docId).get();
  if (!snap.exists || snap.data().ownerId !== user.uid) throw new HttpsError('not-found', 'Document not found.');
  await purgeDocument(docId, user.uid);
  await audit({ actor: user, action: 'document.delete', ownerId: user.uid, docId, docTitle: snap.data().title, rawRequest: request.rawRequest });
  return { ok: true };
}));

// Streams the decrypted file. The browser calls this with
// Authorization: Bearer <ID token>, so access is always checked server side.
export const download = onRequest({ region: REGION, secrets: [VAULT_MASTER_KEY], memory: '1GiB', cors: false }, async (req, res) => {
  const fail = (status, message) => res.status(status).set('Cache-Control', 'no-store').json({ error: message });
  try {
    if (req.method !== 'GET') return fail(405, 'Method not allowed');
    const match = /^Bearer (.+)$/.exec(req.get('authorization') || '');
    if (!match) return fail(401, 'Sign in to continue.');

    let decoded;
    try {
      decoded = await auth.verifyIdToken(match[1], true);
    } catch {
      return fail(401, 'Your session has expired. Sign in again.');
    }
    if (decoded.email_verified !== true) return fail(403, 'Verify your email address first.');

    const user = { uid: decoded.uid, email: String(decoded.email || '').toLowerCase() };
    const docId = cleanId(req.query.id, 'Document id');
    const wantsDownload = req.query.disposition === 'attachment';

    await rateLimit(user.uid, 'download', { limit: 120, windowSeconds: 3600 });

    const snap = await db.collection('documents').doc(docId).get();
    if (!snap.exists) return fail(404, 'Document not found.');
    const doc = snap.data();

    const shareSnap = await db.collection('shares').doc(`${docId}_${user.uid}`).get();
    const access = accessFor(doc, { uid: user.uid, familyId: decoded.familyId || null, share: shareSnap.exists ? shareSnap.data() : null });
    if (access.level === 'none') return fail(404, 'Document not found.');
    if (wantsDownload && !access.canDownload) return fail(403, 'You can view this document but not download it.');

    const [keySnap, [ciphertext]] = await Promise.all([
      db.collection('docKeys').doc(docId).get(),
      bucket().file(vaultPath(doc.ownerId, docId)).download()
    ]);
    if (!keySnap.exists) return fail(500, 'This document cannot be opened.');

    const plaintext = decryptFile(ciphertext, keySnap.data().wrappedKey, { docId, ownerId: doc.ownerId, masterKey: masterKey() });

    await audit({
      actor: user, action: wantsDownload ? 'document.download' : 'document.view', ownerId: doc.ownerId, docId,
      docTitle: doc.title, detail: access.level === 'owner' ? null : `via ${access.via}`, rawRequest: req
    });

    const fileName = safeFileName(doc.title, doc.extension);
    res.status(200)
      .set('Content-Type', doc.mimeType)
      .set('Content-Length', String(plaintext.length))
      .set('Content-Disposition', `${wantsDownload ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(fileName)}`)
      .set('X-Content-Type-Options', 'nosniff')
      .set('Cache-Control', 'private, no-store')
      .send(plaintext);
  } catch (error) {
    if (error instanceof ValidationError) return fail(400, error.message);
    if (error instanceof HttpsError) return fail(error.httpErrorCode?.status || 429, error.message);
    console.error('download failed', error);
    return fail(500, 'Could not open the document.');
  }
});
