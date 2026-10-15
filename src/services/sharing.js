import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase.js';
import { call } from './api.js';
import { getState } from '../lib/store.js';

export async function loadShares() {
  const uid = getState().user.uid;
  const [out, incoming] = await Promise.all([
    getDocs(query(collection(db, 'shares'), where('ownerId', '==', uid))),
    getDocs(query(collection(db, 'shares'), where('recipientUid', '==', uid)))
  ]);
  const plain = (d) => ({ id: d.id, ...d.data() });
  return { created: out.docs.map(plain), received: incoming.docs.map(plain) };
}

export async function sharesForDocument(docId) {
  const uid = getState().user.uid;
  const snap = await getDocs(query(collection(db, 'shares'), where('ownerId', '==', uid), where('docId', '==', docId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export const shareDocument = (payload) => call('shareDocument', payload);
export const revokeShare = (shareId) => call('revokeShare', { shareId });
