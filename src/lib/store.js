// A tiny observable store for session state shared across views.
const state = {
  ready: false,
  user: null, // Firebase user
  profile: null, // users/{uid}
  familyId: null, // custom claim
  theme: 'system'
};
const listeners = new Set();

export const getState = () => state;

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const isVerified = () => Boolean(state.user?.emailVerified);

// Safe wrappers: storage can throw in private windows.
export const remember = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(`vaultara.${key}`);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`vaultara.${key}`, value);
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(`vaultara.${key}`);
    } catch {
      /* ignore */
    }
  }
};
