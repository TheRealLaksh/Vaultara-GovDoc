import { describe, expect, it } from 'vitest';
import { daysUntil, expiryStatus, formatBytes, initials, plural, refNumber, relativeTime } from '../../src/lib/format.js';

const now = new Date('2026-10-15T12:00:00Z');

describe('format helpers', () => {
  it('formats bytes', () => {
    expect(formatBytes(77)).toBe('77 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('counts days to expiry', () => {
    expect(daysUntil(new Date('2026-10-25T12:00:00Z'), now)).toBe(10);
    expect(daysUntil(null, now)).toBeNull();
  });

  it('classifies expiry', () => {
    expect(expiryStatus(new Date('2026-10-10T12:00:00Z'), now).tone).toBe('danger');
    expect(expiryStatus(new Date('2026-11-01T12:00:00Z'), now).tone).toBe('danger');
    expect(expiryStatus(new Date('2026-12-15T12:00:00Z'), now).tone).toBe('warn');
    expect(expiryStatus(new Date('2028-01-01T12:00:00Z'), now).tone).toBe('ok');
    expect(expiryStatus(null, now)).toBeNull();
  });

  it('describes relative time', () => {
    expect(relativeTime(new Date('2026-10-15T11:59:50Z'), now)).toBe('just now');
    expect(relativeTime(new Date('2026-10-15T11:30:00Z'), now)).toBe('30 min ago');
    expect(relativeTime(new Date('2026-10-13T12:00:00Z'), now)).toBe('2 d ago');
  });

  it('builds initials, plurals and reference numbers', () => {
    expect(initials('Laksh Pradhwani')).toBe('LP');
    expect(initials('')).toBe('?');
    expect(plural(1, 'document')).toBe('1 document');
    expect(plural(3, 'document')).toBe('3 documents');
    expect(refNumber('abc-DEF_123xyz')).toBe('VLT-ABCDEF');
  });
});
