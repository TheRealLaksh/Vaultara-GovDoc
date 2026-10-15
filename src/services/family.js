import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase.js';
import { call } from './api.js';
import { getState } from '../lib/store.js';
import { refreshSession } from './auth.js';

export async function loadFamily() {
  const { user } = getState();
  const families = await getDocs(query(collection(db, 'families'), where('memberUids', 'array-contains', user.uid)));
  if (families.empty) return { family: null, invites: [] };
  const familyDoc = families.docs[0];
  const family = { id: familyDoc.id, ...familyDoc.data() };
  let invites = [];
  if (family.ownerId === user.uid) {
    const snap = await getDocs(query(collection(db, 'familyInvites'), where('createdBy', '==', user.uid)));
    invites = snap.docs.map((d) => ({ code: d.id, ...d.data() })).filter((i) => !i.used && i.expiresAt.toMillis() > Date.now());
  }
  return { family, invites };
}

// Membership changes alter the custom claim, so refresh the token afterwards.
const withRefresh = (name) => async (data) => {
  const result = await call(name, data);
  await refreshSession();
  return result;
};

export const createFamily = withRefresh('createFamily');
export const joinFamily = withRefresh('joinFamily');
export const leaveFamily = withRefresh('leaveFamily');
export const disbandFamily = withRefresh('disbandFamily');
export const removeFamilyMember = (uid) => call('removeFamilyMember', { uid });
export const createInvite = () => call('createInvite');
export const revokeInvite = (code) => call('revokeInvite', { code });
