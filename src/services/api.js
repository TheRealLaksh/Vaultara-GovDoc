import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase.js';

// Calls a Cloud Function and returns its data. Errors keep the server's
// friendly message and gain a `code` such as "not-found".
export async function call(name, data = {}) {
  try {
    const result = await httpsCallable(functions, name)(data);
    return result.data;
  } catch (error) {
    const code = String(error.code || '').replace('functions/', '');
    const friendly = new Error(
      code === 'internal' || code === 'unavailable'
        ? 'The service is not reachable right now. Please try again in a moment.'
        : error.message || 'Something went wrong.'
    );
    friendly.code = code;
    throw friendly;
  }
}
