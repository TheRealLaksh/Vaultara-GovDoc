import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { decryptFile, encryptFile, open, parseMasterKey, seal, sha256Hex } from '../src/crypto.js';

const masterKey = randomBytes(32);
const ctx = { docId: 'docIdAAAAAAAAAAAAAAAAAA', ownerId: 'owner1', masterKey };

describe('envelope encryption', () => {
  it('round-trips a file', () => {
    const plain = randomBytes(5000);
    const { ciphertext, wrappedKey } = encryptFile(plain, ctx);
    expect(ciphertext.equals(plain)).toBe(false);
    expect(decryptFile(ciphertext, wrappedKey, ctx).equals(plain)).toBe(true);
  });

  it('uses a fresh key and nonce every time', () => {
    const plain = Buffer.from('same input');
    const a = encryptFile(plain, ctx);
    const b = encryptFile(plain, ctx);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
    expect(a.wrappedKey.equals(b.wrappedKey)).toBe(false);
  });

  it('refuses a ciphertext moved to another document', () => {
    const { ciphertext, wrappedKey } = encryptFile(Buffer.from('secret'), ctx);
    expect(() => decryptFile(ciphertext, wrappedKey, { ...ctx, docId: 'otherDocAAAAAAAAAAAAAAAA' })).toThrow();
  });

  it('refuses a ciphertext claimed by another owner', () => {
    const { ciphertext, wrappedKey } = encryptFile(Buffer.from('secret'), ctx);
    expect(() => decryptFile(ciphertext, wrappedKey, { ...ctx, ownerId: 'attacker' })).toThrow();
  });

  it('refuses the wrong master key', () => {
    const { ciphertext, wrappedKey } = encryptFile(Buffer.from('secret'), ctx);
    expect(() => decryptFile(ciphertext, wrappedKey, { ...ctx, masterKey: randomBytes(32) })).toThrow();
  });

  it('detects tampering', () => {
    const { ciphertext, wrappedKey } = encryptFile(Buffer.from('secret data here'), ctx);
    ciphertext[ciphertext.length - 1] ^= 0x01;
    expect(() => decryptFile(ciphertext, wrappedKey, ctx)).toThrow();
  });

  it('rejects truncated and unknown-version blobs', () => {
    expect(() => open(Buffer.alloc(10), masterKey, 'x')).toThrow(/short/);
    const blob = seal(Buffer.from('x'), masterKey, 'x');
    blob[0] = 9;
    expect(() => open(blob, masterKey, 'x')).toThrow(/version/);
  });

  it('validates the master key', () => {
    expect(parseMasterKey(randomBytes(32).toString('base64')).length).toBe(32);
    expect(() => parseMasterKey('short')).toThrow();
    expect(() => parseMasterKey('')).toThrow();
  });

  it('hashes with sha256', () => {
    expect(sha256Hex(Buffer.from('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
