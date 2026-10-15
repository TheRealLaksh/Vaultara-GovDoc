import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from './firebase.js';
import { getState } from '../lib/store.js';

export const PAGE = 30;

// Each entry is readable by the person who acted and by the owner of the document.
export async function loadActivity({ docId = null, after = null } = {}) {
  const uid = getState().user.uid;
  const parts = [collection(db, 'auditLogs')];
  if (docId) parts.push(where('docId', '==', docId));
  parts.push(where('subjects', 'array-contains', uid), orderBy('createdAt', 'desc'));
  if (after) parts.push(startAfter(after));
  parts.push(limit(PAGE));
  const snap = await getDocs(query(...parts));
  return { items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), cursor: snap.docs.at(-1) || null, more: snap.size === PAGE };
}

// How each action is presented in the UI.
export const ACTIONS = {
  'account.register': { label: 'Created your account', icon: 'user', group: 'Account' },
  'account.login': { label: 'Signed in', icon: 'key', group: 'Account' },
  'account.export': { label: 'Exported your data', icon: 'download', group: 'Account' },
  'document.upload': { label: 'Added a document', icon: 'upload', group: 'Documents' },
  'document.update': { label: 'Edited a document', icon: 'edit', group: 'Documents' },
  'document.view': { label: 'Opened a document', icon: 'eye', group: 'Documents' },
  'document.download': { label: 'Downloaded a document', icon: 'download', group: 'Documents' },
  'document.delete': { label: 'Deleted a document', icon: 'trash', group: 'Documents' },
  'share.create': { label: 'Shared a document', icon: 'share', group: 'Sharing' },
  'share.revoke': { label: 'Stopped sharing', icon: 'close', group: 'Sharing' },
  'share.leave': { label: 'Removed a shared document', icon: 'close', group: 'Sharing' },
  'family.create': { label: 'Started a family', icon: 'family', group: 'Family' },
  'family.invite': { label: 'Created an invite', icon: 'mail', group: 'Family' },
  'family.join': { label: 'Joined a family', icon: 'family', group: 'Family' },
  'family.leave': { label: 'Left the family', icon: 'logout', group: 'Family' },
  'family.remove': { label: 'Removed a family member', icon: 'close', group: 'Family' },
  'family.disband': { label: 'Disbanded the family', icon: 'trash', group: 'Family' }
};

const VERBS = {
  'account.register': 'created the account',
  'account.login': 'signed in',
  'account.export': 'exported account data',
  'document.upload': 'added',
  'document.update': 'edited',
  'document.view': 'opened',
  'document.download': 'downloaded',
  'document.delete': 'deleted',
  'share.create': 'shared',
  'share.revoke': 'stopped sharing',
  'share.leave': 'removed their access to',
  'family.create': 'started a family',
  'family.invite': 'created a family invite',
  'family.join': 'joined the family',
  'family.leave': 'left the family',
  'family.remove': 'removed a family member',
  'family.disband': 'disbanded the family'
};

// Turns an audit entry into { title, sub } for display.
export function describe(entry, meId) {
  const actor = entry.actorId === meId ? 'You' : entry.actorEmail || 'Someone';
  const verb = VERBS[entry.action] || entry.action;
  const title = entry.docTitle ? `${actor} ${verb} \u201c${entry.docTitle}\u201d` : `${actor} ${verb}`;
  const bits = [];
  if (entry.detail) bits.push(entry.detail);
  if (entry.ip) bits.push(`from ${entry.ip}`);
  return { title, sub: bits.join('  \u00b7  ') };
}
