import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
// rules-unit-testing hands back compat Firestore instances; these helpers keep the tests readable.
const doc = (db, path) => db.doc(path);
const collection = (db, path) => db.collection(path);
const getDoc = (ref) => ref.get();
const getDocs = (q) => q.get();
const setDoc = (ref, data) => ref.set(data);
const updateDoc = (ref, data) => ref.update(data);
const deleteDoc = (ref) => ref.delete();
const addDoc = (col, data) => col.add(data);
const where = (field, op, value) => ({ field, op, value });
const orderBy = (field, dir = 'asc') => ({ orderBy: field, dir });
const query = (col, ...clauses) => clauses.reduce((q, c) => (c.orderBy ? q.orderBy(c.orderBy, c.dir) : q.where(c.field, c.op, c.value)), col);

let env;
const verified = (uid, extra = {}) => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true, ...extra }).firestore();
const unverified = (uid) => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: false }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'vaultara-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});
afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { displayName: 'Alice', theme: 'system', familyId: 'fam1', email: 'alice@example.com' });
    await setDoc(doc(db, 'documents/d1'), { ownerId: 'alice', title: 'Passport', sharedWithUids: ['bob'], familyShared: true, familyId: 'fam1' });
    await setDoc(doc(db, 'documents/d2'), { ownerId: 'alice', title: 'Private', sharedWithUids: [], familyShared: false, familyId: 'fam1' });
    await setDoc(doc(db, 'docKeys/d1'), { wrappedKey: 'x' });
    await setDoc(doc(db, 'shares/d1_bob'), { docId: 'd1', ownerId: 'alice', recipientUid: 'bob' });
    await setDoc(doc(db, 'families/fam1'), { memberUids: ['alice', 'carol'], ownerId: 'alice' });
    await setDoc(doc(db, 'familyInvites/ABCD2345'), { createdBy: 'alice', familyId: 'fam1' });
    await setDoc(doc(db, 'auditLogs/l1'), { subjects: ['alice', 'bob'], createdAt: new Date() });
  });
});

describe('documents', () => {
  it('owner reads own document', async () => assertSucceeds(getDoc(doc(verified('alice'), 'documents/d1'))));
  it('stranger cannot read', async () => assertFails(getDoc(doc(verified('eve'), 'documents/d1'))));
  it('unauthenticated cannot read', async () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'documents/d1'))));
  it('unverified owner cannot read', async () => assertFails(getDoc(doc(unverified('alice'), 'documents/d1'))));
  it('recipient reads shared document', async () => assertSucceeds(getDoc(doc(verified('bob'), 'documents/d1'))));
  it('recipient cannot read an unshared document', async () => assertFails(getDoc(doc(verified('bob'), 'documents/d2'))));
  it('family member with claim reads family document', async () => assertSucceeds(getDoc(doc(verified('carol', { familyId: 'fam1' }), 'documents/d1'))));
  it('family member cannot read non family document', async () => assertFails(getDoc(doc(verified('carol', { familyId: 'fam1' }), 'documents/d2'))));
  it('someone with another family claim cannot read', async () => assertFails(getDoc(doc(verified('dave', { familyId: 'fam2' }), 'documents/d1'))));
  it('without a family claim family flag grants nothing', async () => assertFails(getDoc(doc(verified('dave'), 'documents/d1'))));

  it('owner query is allowed', async () =>
    assertSucceeds(getDocs(query(collection(verified('alice'), 'documents'), where('ownerId', '==', 'alice')))));
  it('shared query is allowed', async () =>
    assertSucceeds(getDocs(query(collection(verified('bob'), 'documents'), where('sharedWithUids', 'array-contains', 'bob')))));
  it('family query is allowed with matching claim', async () =>
    assertSucceeds(getDocs(query(collection(verified('carol', { familyId: 'fam1' }), 'documents'), where('familyShared', '==', true), where('familyId', '==', 'fam1')))));
  it('listing every document is denied', async () => assertFails(getDocs(collection(verified('alice'), 'documents'))));
  it('owner cannot query another owner', async () =>
    assertFails(getDocs(query(collection(verified('eve'), 'documents'), where('ownerId', '==', 'alice')))));

  it('nobody can write documents from a client', async () => {
    await assertFails(setDoc(doc(verified('alice'), 'documents/new'), { ownerId: 'alice' }));
    await assertFails(updateDoc(doc(verified('alice'), 'documents/d1'), { title: 'x' }));
    await assertFails(deleteDoc(doc(verified('alice'), 'documents/d1')));
    await assertFails(updateDoc(doc(verified('bob'), 'documents/d1'), { sharedWithUids: ['bob', 'eve'] }));
  });
});

describe('server only collections', () => {
  it('docKeys are unreadable by anyone', async () => {
    await assertFails(getDoc(doc(verified('alice'), 'docKeys/d1')));
    await assertFails(setDoc(doc(verified('alice'), 'docKeys/d9'), { wrappedKey: 'x' }));
  });
  it('rateLimits are closed', async () => assertFails(getDoc(doc(verified('alice'), 'rateLimits/alice_upload'))));
  it('unknown collections are closed', async () => assertFails(getDoc(doc(verified('alice'), 'secrets/x'))));
});

describe('shares', () => {
  it('owner and recipient can read', async () => {
    await assertSucceeds(getDoc(doc(verified('alice'), 'shares/d1_bob')));
    await assertSucceeds(getDoc(doc(verified('bob'), 'shares/d1_bob')));
  });
  it('others cannot', async () => assertFails(getDoc(doc(verified('eve'), 'shares/d1_bob'))));
  it('nobody can write', async () => {
    await assertFails(setDoc(doc(verified('bob'), 'shares/d1_eve'), { docId: 'd1', recipientUid: 'eve', ownerId: 'bob' }));
    await assertFails(deleteDoc(doc(verified('alice'), 'shares/d1_bob')));
  });
});

describe('families and invites', () => {
  it('members read their family', async () => assertSucceeds(getDoc(doc(verified('carol'), 'families/fam1'))));
  it('non members cannot', async () => assertFails(getDoc(doc(verified('eve'), 'families/fam1'))));
  it('members cannot write', async () => assertFails(updateDoc(doc(verified('carol'), 'families/fam1'), { ownerId: 'carol' })));
  it('only the creator reads invites', async () => {
    await assertSucceeds(getDoc(doc(verified('alice'), 'familyInvites/ABCD2345')));
    await assertFails(getDoc(doc(verified('carol'), 'familyInvites/ABCD2345')));
  });
  it('invites cannot be forged', async () => assertFails(setDoc(doc(verified('eve'), 'familyInvites/ZZZZ2222'), { createdBy: 'eve', familyId: 'fam1' })));
});

describe('audit logs', () => {
  it('actor and owner can read, others cannot', async () => {
    await assertSucceeds(getDoc(doc(verified('alice'), 'auditLogs/l1')));
    await assertSucceeds(getDoc(doc(verified('bob'), 'auditLogs/l1')));
    await assertFails(getDoc(doc(verified('eve'), 'auditLogs/l1')));
  });
  it('query by subject works', async () =>
    assertSucceeds(getDocs(query(collection(verified('alice'), 'auditLogs'), where('subjects', 'array-contains', 'alice'), orderBy('createdAt', 'desc')))));
  it('cannot be written, edited or deleted', async () => {
    await assertFails(addDoc(collection(verified('alice'), 'auditLogs'), { subjects: ['alice'] }));
    await assertFails(updateDoc(doc(verified('alice'), 'auditLogs/l1'), { action: 'x' }));
    await assertFails(deleteDoc(doc(verified('alice'), 'auditLogs/l1')));
  });
});

describe('profiles', () => {
  it('owner reads and edits allowed fields', async () => {
    await assertSucceeds(getDoc(doc(verified('alice'), 'users/alice')));
    await assertSucceeds(updateDoc(doc(verified('alice'), 'users/alice'), { displayName: 'Alice B', theme: 'dark' }));
  });
  it('cannot read another profile', async () => assertFails(getDoc(doc(verified('eve'), 'users/alice'))));
  it('cannot change familyId, email or add fields', async () => {
    await assertFails(updateDoc(doc(verified('alice'), 'users/alice'), { familyId: 'fam2' }));
    await assertFails(updateDoc(doc(verified('alice'), 'users/alice'), { email: 'x@y.z' }));
    await assertFails(updateDoc(doc(verified('alice'), 'users/alice'), { isAdmin: true }));
  });
  it('rejects invalid values', async () => {
    await assertFails(updateDoc(doc(verified('alice'), 'users/alice'), { theme: 'neon' }));
    await assertFails(updateDoc(doc(verified('alice'), 'users/alice'), { displayName: 'x'.repeat(200) }));
  });
  it('cannot create or delete profiles', async () => {
    await assertFails(setDoc(doc(verified('newbie'), 'users/newbie'), { displayName: 'N', theme: 'light' }));
    await assertFails(deleteDoc(doc(verified('alice'), 'users/alice')));
  });
});
