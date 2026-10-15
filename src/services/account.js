import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { call } from './api.js';
import { applyTheme, reauthenticate, refreshSession, updateName } from './auth.js';
import { saveBlob } from './vault.js';

export async function saveProfile({ displayName, theme }) {
  await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName, theme, updatedAt: serverTimestamp() });
  await updateName(displayName);
  applyTheme(theme);
  await refreshSession();
}

export async function setTheme(theme) {
  applyTheme(theme);
  await updateDoc(doc(db, 'users', auth.currentUser.uid), { theme, updatedAt: serverTimestamp() });
}

export async function exportData() {
  const data = await call('exportMyData');
  saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'vaultara-export.json');
}

export async function deleteAccount(password, confirm) {
  await reauthenticate(password);
  await auth.currentUser.getIdToken(true);
  return call('deleteMyAccount', { confirm });
}
