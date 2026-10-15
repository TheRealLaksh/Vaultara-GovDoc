import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Envelope encryption.
//   file bytes --AES-256-GCM(dataKey)--> ciphertext
//   dataKey    --AES-256-GCM(masterKey)--> wrappedKey
// Blob layout: version(1) | iv(12) | tag(16) | ciphertext
const VERSION = 1;
const IV_LEN = 12;
const TAG_LEN = 16;

export function parseMasterKey(base64) {
  const key = Buffer.from(String(base64 || '').trim(), 'base64');
  if (key.length !== 32) {
    throw new Error('VAULT_MASTER_KEY must be 32 bytes encoded as base64');
  }
  return key;
}

export function generateDataKey() {
  return randomBytes(32);
}

export function seal(plaintext, key, aad) {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), body]);
}

export function open(blob, key, aad) {
  if (!Buffer.isBuffer(blob) || blob.length < 1 + IV_LEN + TAG_LEN) {
    throw new Error('Ciphertext is too short');
  }
  if (blob[0] !== VERSION) {
    throw new Error('Unsupported ciphertext version');
  }
  const iv = blob.subarray(1, 1 + IV_LEN);
  const tag = blob.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
  const body = blob.subarray(1 + IV_LEN + TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

// The additional data binds a ciphertext to one document and one owner, so a
// blob copied to another document id fails to decrypt.
export const fileAad = (docId, ownerId) => `file:${ownerId}:${docId}`;
export const keyAad = (docId) => `key:${docId}`;

export function encryptFile(plaintext, { docId, ownerId, masterKey }) {
  const dataKey = generateDataKey();
  const ciphertext = seal(plaintext, dataKey, fileAad(docId, ownerId));
  const wrappedKey = seal(dataKey, masterKey, keyAad(docId));
  dataKey.fill(0);
  return { ciphertext, wrappedKey };
}

export function decryptFile(ciphertext, wrappedKey, { docId, ownerId, masterKey }) {
  const dataKey = open(wrappedKey, masterKey, keyAad(docId));
  try {
    return open(ciphertext, dataKey, fileAad(docId, ownerId));
  } finally {
    dataKey.fill(0);
  }
}

export const sha256Hex = (buf) => createHash('sha256').update(buf).digest('hex');
