import {
  EmailAuthProvider, TotpMultiFactorGenerator, createUserWithEmailAndPassword, getMultiFactorResolver,
  isSignInWithEmailLink, multiFactor, onAuthStateChanged, reauthenticateWithCredential, sendEmailVerification,
  sendPasswordResetEmail, sendSignInLinkToEmail, signInWithEmailAndPassword, signInWithEmailLink, signOut,
  updatePassword, updateProfile
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { auth, db } from './firebase.js';
import { call } from './api.js';
import { remember, setState } from '../lib/store.js';

const origin = () => location.origin;

const FRIENDLY = {
  'auth/invalid-credential': 'That email and password do not match.',
  'auth/wrong-password': 'That email and password do not match.',
  'auth/user-not-found': 'That email and password do not match.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with that email already exists. Try signing in.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes, then try again.',
  'auth/network-request-failed': 'Network problem. Check your connection and try again.',
  'auth/invalid-verification-code': 'That code is not correct. Check your authenticator app.',
  'auth/code-expired': 'That code has expired. Use the latest code.',
  'auth/requires-recent-login': 'For your security, please enter your password again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/expired-action-code': 'This link has expired. Request a new one.',
  'auth/invalid-action-code': 'This link is not valid any more. Request a new one.',
  'auth/missing-password': 'Enter your password.'
};

export const friendlyAuthError = (error) => {
  const message = FRIENDLY[error?.code];
  const wrapped = new Error(message || error?.message || 'Something went wrong. Please try again.');
  wrapped.code = error?.code;
  return wrapped;
};

async function guard(promise) {
  try {
    return await promise;
  } catch (error) {
    throw friendlyAuthError(error);
  }
}

// Reads claims and profile into the store so views can stay synchronous.
async function hydrate(user) {
  if (!user) {
    setState({ user: null, profile: null, familyId: null, ready: true });
    return;
  }
  const token = await user.getIdTokenResult();
  let profile = null;
  if (user.emailVerified) {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      profile = snap.exists() ? snap.data() : null;
    } catch {
      profile = null;
    }
  }
  setState({ user, profile, familyId: token.claims.familyId || null, ready: true });
  if (profile?.theme) applyTheme(profile.theme);
}

export function initAuth() {
  return new Promise((resolve) => {
    let first = true;
    onAuthStateChanged(auth, async (user) => {
      await hydrate(user);
      if (first) {
        first = false;
        resolve();
      }
    });
  });
}

export async function refreshSession() {
  const user = auth.currentUser;
  if (!user) return;
  await user.reload();
  await user.getIdToken(true);
  await hydrate(auth.currentUser);
}

async function afterSignIn(event) {
  try {
    await call('recordSession', { event });
  } catch (error) {
    console.warn('Could not record session', error.message);
  }
  await refreshSession();
}

export async function register({ name, email, password }) {
  const credential = await guard(createUserWithEmailAndPassword(auth, email, password));
  await guard(updateProfile(credential.user, { displayName: name }));
  await guard(sendEmailVerification(credential.user, { url: `${origin()}/app` }));
  await afterSignIn('register');
}

// Returns { mfa: { resolver, hints } } when a second factor is required.
export async function login({ email, password }) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error.code === 'auth/multi-factor-auth-required') {
      const resolver = getMultiFactorResolver(auth, error);
      return { mfa: resolver };
    }
    throw friendlyAuthError(error);
  }
  await afterSignIn('login');
  return { mfa: null };
}

export async function completeMfa(resolver, code) {
  const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID) || resolver.hints[0];
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code.replace(/\s/g, ''));
  await guard(resolver.resolveSignIn(assertion));
  await afterSignIn('login');
}

export async function sendLoginLink(email) {
  await guard(sendSignInLinkToEmail(auth, email, { url: `${origin()}/login?link=1`, handleCodeInApp: true }));
  remember.set('emailForLink', email);
}

export const isLoginLink = () => isSignInWithEmailLink(auth, location.href);

export async function finishLoginLink(email) {
  await guard(signInWithEmailLink(auth, email, location.href));
  remember.remove('emailForLink');
  await afterSignIn('login');
}

export const resetPassword = (email) =>
  guard(sendPasswordResetEmail(auth, email, { url: `${origin()}/login` }));

export const resendVerification = () => guard(sendEmailVerification(auth.currentUser, { url: `${origin()}/app` }));

export async function logout() {
  await signOut(auth);
  setState({ user: null, profile: null, familyId: null });
}

export async function reauthenticate(password) {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, password);
  await guard(reauthenticateWithCredential(user, credential));
}

export async function changePassword(current, next) {
  await reauthenticate(current);
  await guard(updatePassword(auth.currentUser, next));
}

export async function updateName(displayName) {
  await guard(updateProfile(auth.currentUser, { displayName }));
}

// ---- Two-factor (TOTP) -------------------------------------------------
export const enrolledFactors = () => multiFactor(auth.currentUser).enrolledFactors;

export async function startTotpEnrollment(password) {
  await reauthenticate(password);
  const user = auth.currentUser;
  const session = await guard(multiFactor(user).getSession());
  const secret = await guard(TotpMultiFactorGenerator.generateSecret(session));
  const uri = secret.generateQrCodeUrl(user.email, 'Vaultara');
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: '#1D1B16', light: '#FFFFFF' } });
  return { secret, qr, key: secret.secretKey };
}

export async function finishTotpEnrollment(secret, code) {
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code.replace(/\s/g, ''));
  await guard(multiFactor(auth.currentUser).enroll(assertion, 'Authenticator app'));
  await refreshSession();
}

export async function removeFactor(factorUid, password) {
  await reauthenticate(password);
  const factor = enrolledFactors().find((f) => f.uid === factorUid);
  if (factor) await guard(multiFactor(auth.currentUser).unenroll(factor));
  await refreshSession();
}

// ---- Theme ------------------------------------------------------------
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  remember.set('theme', theme);
  try {
    if (theme === 'light' || theme === 'dark') localStorage.setItem('vaultara.theme', theme);
    else localStorage.removeItem('vaultara.theme');
  } catch {
    /* ignore */
  }
  setState({ theme });
}
