import { describe, expect, it } from 'vitest';
import { accessFor, isExpired } from '../src/access.js';

const doc = { ownerId: 'alice', familyShared: true, familyId: 'fam1' };
const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);
const share = (over = {}) => ({ docId: 'd', recipientUid: 'bob', permission: 'view', expiresAt: null, ...over });

describe('accessFor', () => {
  it('owner has full access', () => {
    expect(accessFor(doc, { uid: 'alice' })).toMatchObject({ level: 'owner', canDownload: true });
  });

  it('a stranger has none', () => {
    expect(accessFor(doc, { uid: 'eve' }).level).toBe('none');
    expect(accessFor(null, { uid: 'alice' }).level).toBe('none');
  });

  it('share grants view or download according to permission', () => {
    expect(accessFor({ ownerId: 'alice' }, { uid: 'bob', share: share() })).toMatchObject({ level: 'shared', canDownload: false });
    expect(accessFor({ ownerId: 'alice' }, { uid: 'bob', share: share({ permission: 'download' }) }).canDownload).toBe(true);
  });

  it('expired share gives nothing', () => {
    expect(accessFor({ ownerId: 'alice' }, { uid: 'bob', share: share({ expiresAt: past }) }).level).toBe('none');
    expect(accessFor({ ownerId: 'alice' }, { uid: 'bob', share: share({ expiresAt: future }) }).level).toBe('shared');
  });

  it('a share addressed to someone else is ignored', () => {
    expect(accessFor({ ownerId: 'alice' }, { uid: 'eve', share: share() }).level).toBe('none');
  });

  it('family access needs matching family and the family flag', () => {
    expect(accessFor(doc, { uid: 'bob', familyId: 'fam1' }).level).toBe('family');
    expect(accessFor(doc, { uid: 'bob', familyId: 'fam2' }).level).toBe('none');
    expect(accessFor({ ...doc, familyShared: false }, { uid: 'bob', familyId: 'fam1' }).level).toBe('none');
    expect(accessFor({ ownerId: 'alice', familyShared: true, familyId: null }, { uid: 'bob', familyId: null }).level).toBe('none');
  });

  it('isExpired handles timestamps, dates and null', () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired({ toDate: () => past })).toBe(true);
    expect(isExpired(future)).toBe(false);
  });
});
