import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { parseMasterKey } from './crypto.js';
import { ValidationError } from './validate.js';

if (!getApps().length) initializeApp();

export const REGION = 'asia-south1';
export const db = getFirestore();
export const auth = getAuth();
export const bucket = () => getStorage().bucket();
export { FieldValue, Timestamp };

export const VAULT_MASTER_KEY = defineSecret('VAULT_MASTER_KEY');
export const masterKey = () => parseMasterKey(VAULT_MASTER_KEY.value());

export const vaultPath = (ownerId, docId) => `vault/${ownerId}/${docId}.enc`;
export const inboxPath = (uid, uploadId) => `inbox/${uid}/${uploadId}`;

// Callable guard: signed in with a verified email.
export function requireVerified(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email address to use the vault.');
  }
  return { uid: request.auth.uid, email: String(request.auth.token.email || '').toLowerCase(), token: request.auth.token };
}

// Reject if the user did not sign in recently (for destructive actions).
export function requireRecentLogin(token, maxAgeSeconds = 300) {
  const issued = Number(token.auth_time || 0);
  if (!issued || Date.now() / 1000 - issued > maxAgeSeconds) {
    throw new HttpsError('failed-precondition', 'Please confirm your password again to continue.');
  }
}

// Wrap a handler so validation errors become friendly client errors and
// unexpected errors never leak internals.
export function guarded(handler) {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof ValidationError) throw new HttpsError('invalid-argument', error.message);
      console.error('Unhandled error', error);
      throw new HttpsError('internal', 'Something went wrong. Please try again.');
    }
  };
}

// Fixed window rate limit kept in Firestore. Throws when exceeded.
export async function rateLimit(uid, action, { limit, windowSeconds }) {
  const ref = db.collection('rateLimits').doc(`${uid}_${action}`);
  const nowMs = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    if (!data || nowMs - data.windowStart > windowSeconds * 1000) {
      tx.set(ref, { windowStart: nowMs, count: 1 });
      return;
    }
    if (data.count >= limit) {
      throw new HttpsError('resource-exhausted', 'Too many attempts. Please wait a while and try again.');
    }
    tx.update(ref, { count: data.count + 1 });
  });
}

const maskIp = (ip) => {
  if (!ip) return null;
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}::`;
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : null;
};

// The audit trail is written here, never by the browser.
export async function audit({ actor, action, ownerId = null, docId = null, docTitle = null, detail = null, rawRequest = null }) {
  const header = (name) => rawRequest?.headers?.[name];
  const forwarded = String(header('x-forwarded-for') || rawRequest?.ip || '').split(',')[0].trim();
  const subjects = [...new Set([actor.uid, ownerId].filter(Boolean))];
  await db.collection('auditLogs').add({
    actorId: actor.uid,
    actorEmail: actor.email || null,
    ownerId,
    subjects,
    action,
    docId,
    docTitle,
    detail,
    ip: maskIp(forwarded),
    userAgent: String(header('user-agent') || '').slice(0, 160) || null,
    createdAt: FieldValue.serverTimestamp()
  });
}

// Custom claims carry the family id so rules can compare it in queries.
export async function setFamilyClaim(uid, familyId) {
  const user = await auth.getUser(uid);
  const claims = { ...(user.customClaims || {}) };
  if (familyId) claims.familyId = familyId;
  else delete claims.familyId;
  await auth.setCustomUserClaims(uid, claims);
}
