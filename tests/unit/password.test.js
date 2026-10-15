import { describe, expect, it } from 'vitest';
import { passwordStrength } from '../../src/lib/password.js';

describe('passwordStrength', () => {
  it('rejects short and common passwords', () => {
    expect(passwordStrength('abc').ok).toBe(false);
    expect(passwordStrength('Password12345!').ok).toBe(false);
    expect(passwordStrength('aaaaaaaaaaaa').level).toBe(0);
  });

  it('rejects passwords that contain the email name', () => {
    expect(passwordStrength('laksh-Rocks-2026!', 'laksh@example.com').ok).toBe(false);
  });

  it('accepts a long mixed passphrase', () => {
    const result = passwordStrength('Correct horse 7 battery', 'a@b.co');
    expect(result.ok).toBe(true);
    expect(result.level).toBeGreaterThanOrEqual(2);
  });
});
