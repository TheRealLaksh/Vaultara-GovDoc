// Single place that decides who may touch a document. The same rules exist in
// firestore.rules for metadata; this is the authority for file contents.
export function accessFor(doc, { uid, familyId = null, share = null, now = new Date() }) {
  if (!doc) return { level: 'none' };
  if (doc.ownerId === uid) return { level: 'owner', canDownload: true };

  if (share && share.recipientUid === uid && share.docId && !isExpired(share.expiresAt, now)) {
    return { level: 'shared', canDownload: share.permission === 'download', via: 'share' };
  }

  if (doc.familyShared === true && doc.familyId && familyId && doc.familyId === familyId) {
    return { level: 'family', canDownload: true, via: 'family' };
  }
  return { level: 'none' };
}

export function isExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return false;
  const date = typeof expiresAt.toDate === 'function' ? expiresAt.toDate() : new Date(expiresAt);
  return date.getTime() <= now.getTime();
}
