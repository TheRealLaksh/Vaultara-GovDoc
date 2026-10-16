// Writes public/js/firebase-config.js from environment variables at build time (Vercel).
// The file is gitignored, so a Git-based deploy has to create it. These are Firebase *web*
// config values (identifiers, not secrets); access is enforced by Firestore rules, the API
// key's website restriction and Authentication settings.
//
// Locally, if public/js/firebase-config.js already exists this script leaves it alone.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/js/firebase-config.js';

if (existsSync(OUT) && !process.env.VERCEL) {
    console.log(`${OUT} already exists, leaving it as it is.`);
    process.exit(0);
}

const VARS = {
    apiKey: 'FIREBASE_API_KEY',
    authDomain: 'FIREBASE_AUTH_DOMAIN',
    projectId: 'FIREBASE_PROJECT_ID',
    storageBucket: 'FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
    appId: 'FIREBASE_APP_ID',
};

const missing = Object.values(VARS).filter((name) => !process.env[name]);
if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

const config = Object.fromEntries(Object.entries(VARS).map(([key, name]) => [key, process.env[name]]));

const body = `// Generated at build time by scripts/gen-config.mjs. Do not edit.
const firebaseConfig = ${JSON.stringify(config, null, 2)};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
`;

mkdirSync('public/js', { recursive: true });
writeFileSync(OUT, body);
console.log(`Wrote ${OUT} for project ${config.projectId}.`);
