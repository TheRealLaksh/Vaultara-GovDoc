import { describe, expect, it } from 'vitest';
import {
  ValidationError, cleanCategory, cleanEmail, cleanExpiryDate, cleanId, cleanInviteCode, cleanPermission,
  cleanShareDays, cleanTags, cleanText, safeFileName
} from '../src/validate.js';

describe('validate', () => {
  it('cleans text and strips control and bidi characters', () => {
    expect(cleanText('  Passport ‮  copy\n', { field: 'Title' })).toBe('Passport copy');
    expect(() => cleanText('   ', { field: 'Title' })).toThrow(ValidationError);
    expect(() => cleanText('x'.repeat(200), { max: 100 })).toThrow(/at most/);
  });

  it('keeps markup as plain text (escaping happens at render)', () => {
    expect(cleanText('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
  });

  it('checks categories, permissions and emails', () => {
    expect(cleanCategory('Identity')).toBe('Identity');
    expect(() => cleanCategory('Hacking')).toThrow();
    expect(cleanPermission('view')).toBe('view');
    expect(() => cleanPermission('admin')).toThrow();
    expect(cleanEmail('  Person@Example.COM ')).toBe('person@example.com');
    expect(() => cleanEmail('nope')).toThrow();
    expect(() => cleanEmail('a@b')).toThrow();
  });

  it('normalises tags', () => {
    expect(cleanTags(['Passport', 'passport', ' ID!! ', '', 'x'.repeat(40)])).toEqual(['passport', 'id', 'x'.repeat(24)]);
    expect(cleanTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(8);
    expect(cleanTags(undefined)).toEqual([]);
    expect(() => cleanTags('a')).toThrow();
  });

  it('parses expiry dates', () => {
    expect(cleanExpiryDate('')).toBeNull();
    expect(cleanExpiryDate('2030-05-01').toISOString()).toBe('2030-05-01T23:59:59.000Z');
    expect(() => cleanExpiryDate('2030-13-45')).toThrow();
    expect(() => cleanExpiryDate('tomorrow')).toThrow();
    expect(() => cleanExpiryDate('1850-01-01')).toThrow();
  });

  it('checks share duration', () => {
    expect(cleanShareDays('')).toBeNull();
    expect(cleanShareDays(7)).toBe(7);
    expect(() => cleanShareDays(0.5)).toThrow();
    expect(() => cleanShareDays(9999)).toThrow();
  });

  it('checks ids and invite codes', () => {
    expect(cleanId('a'.repeat(24))).toBe('a'.repeat(24));
    expect(() => cleanId('../etc/passwd')).toThrow();
    expect(() => cleanId('short')).toThrow();
    expect(cleanInviteCode('abcd-2345')).toBe('ABCD2345');
    expect(() => cleanInviteCode('ABCD0OIl')).toThrow();
  });

  it('builds safe filenames', () => {
    expect(safeFileName('My Aadhaar/../card"', 'pdf')).toBe('My Aadhaar..card.pdf');
    expect(safeFileName('???', 'png')).toBe('document.png');
  });
});
