import {
  collection, doc, getDoc, getDocs, query, where
} from 'firebase/firestore';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { auth, db, storage } from './firebase.js';
import { call } from './api.js';
import { getState } from '../lib/store.js';

export const MAX_BYTES = 15 * 1024 * 1024;
export const CATEGORIES = ['Identity', 'Education', 'Health', 'Finance', 'Property', 'Other'];
export const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];

const asDoc = (snap, access, share = null) => ({ id: snap.id, ...snap.data(), access, share });

// Loads every document the person can see and labels how they can see it.
export async function loadVault() {
  const { user, familyId } = getState();
  const uid = user.uid;
  const jobs = [
    getDocs(query(collection(db, 'documents'), where('ownerId', '==', uid))),
    getDocs(query(collection(db, 'documents'), where('sharedWithUids', 'array-contains', uid))),
    getDocs(query(collection(db, 'shares'), where('recipientUid', '==', uid)))
  ];
  if (familyId) {
    jobs.push(getDocs(query(collection(db, 'documents'), where('familyShared', '==', true), where('familyId', '==', familyId))));
  }
  const [owned, shared, shares, family] = await Promise.all(jobs);

  const shareByDoc = new Map(shares.docs.map((s) => [s.data().docId, { id: s.id, ...s.data() }]));
  const map = new Map();
  owned.docs.forEach((d) => map.set(d.id, asDoc(d, 'owner')));
  shared.docs.forEach((d) => !map.has(d.id) && map.set(d.id, asDoc(d, 'shared', shareByDoc.get(d.id) || null)));
  family?.docs.forEach((d) => !map.has(d.id) && map.set(d.id, asDoc(d, 'family')));
  return [...map.values()];
}

export async function getDocument(id) {
  let snap;
  try {
    snap = await getDoc(doc(db, 'documents', id));
  } catch (error) {
    // The rules answer "denied" for documents the person has no claim to.
    if (error.code === 'permission-denied') return null;
    throw error;
  }
  if (!snap.exists()) return null;
  const data = snap.data();
  const { user, familyId } = getState();
  let access = 'owner';
  let share = null;
  if (data.ownerId !== user.uid) {
    if (data.sharedWithUids?.includes(user.uid)) {
      access = 'shared';
      const s = await getDoc(doc(db, 'shares', `${id}_${user.uid}`));
      share = s.exists() ? { id: s.id, ...s.data() } : null;
    } else if (data.familyShared && data.familyId === familyId) {
      access = 'family';
    }
  }
  return asDoc(snap, access, share);
}

// Quick client-side check so people get instant feedback. The server checks
// the real bytes again.
export function checkFile(file) {
  if (!file) return 'Choose a file first.';
  if (file.size === 0) return 'That file is empty.';
  if (file.size > MAX_BYTES) return 'That file is larger than 15MB.';
  const name = file.name.toLowerCase();
  const looksRight = ACCEPTED.includes(file.type) || /\.(pdf|jpe?g|png|webp|heic)$/.test(name);
  if (!looksRight) return 'Only PDF, JPEG, PNG, WebP and HEIC files are accepted.';
  return null;
}

export async function readMagic(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const is = (...bytes) => bytes.every((b, i) => head[i] === b);
  if (is(0x25, 0x50, 0x44, 0x46)) return 'PDF';
  if (is(0xff, 0xd8, 0xff)) return 'JPEG';
  if (is(0x89, 0x50, 0x4e, 0x47)) return 'PNG';
  if (is(0x52, 0x49, 0x46, 0x46)) return 'WebP';
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) return 'HEIC';
  return null;
}

const randomId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export async function uploadDocument({ file, title, category, tags, expiresOn, familyShared }, onProgress = () => {}) {
  const problem = checkFile(file);
  if (problem) throw new Error(problem);
  if (!(await readMagic(file))) throw new Error('That file does not look like a PDF or an image.');

  const uploadId = randomId();
  const task = uploadBytesResumable(ref(storage, `inbox/${auth.currentUser.uid}/${uploadId}`), file, {
    contentType: file.type || 'application/octet-stream'
  });
  await new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress({ phase: 'upload', fraction: snap.bytesTransferred / snap.totalBytes }),
      reject,
      resolve
    );
  });
  onProgress({ phase: 'encrypt', fraction: 1 });
  return call('finalizeUpload', { uploadId, title, category, tags, expiresOn, familyShared });
}

export const updateDocument = (docId, changes) => call('updateDocument', { docId, ...changes });
export const deleteDocument = (docId) => call('deleteDocument', { docId });

// Fetches the decrypted file through the authorised download endpoint.
export async function fetchFile(docId, { download = false } = {}) {
  const token = await auth.currentUser.getIdToken();
  const disposition = download ? 'attachment' : 'inline';
  const response = await fetch(`/api/download?id=${encodeURIComponent(docId)}&disposition=${disposition}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!response.ok) {
    let message = 'Could not open the document.';
    try {
      message = (await response.json()).error || message;
    } catch {
      /* not json */
    }
    throw new Error(message);
  }
  return { blob: await response.blob(), type: response.headers.get('content-type') };
}

export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const downloadName = (d) => `${d.title.replace(/[^\p{L}\p{N} _.\-]/gu, '').trim() || 'document'}.${d.extension}`;
