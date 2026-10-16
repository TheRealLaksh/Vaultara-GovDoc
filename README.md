# Vaultara

A private, encrypted vault for the papers that matter: identity cards, certificates, health records. Share them with a person for a limited time, open them to your household, and see a record of everyone who opened them.

Vaultara is an independent project. It is not affiliated with any government body.

## What it does

- **Encrypted storage.** Every file is checked by its first bytes, sealed with AES-256-GCM under its own key, and stored in a bucket no browser can read. The key is wrapped by a master key held in Google Secret Manager.
- **Sharing with an end date.** Share by email as view only or view and download, for 1 to 365 days or until you stop. Revoke at any time.
- **Family.** Start a family, invite people with one-time codes, and choose which documents the household can see.
- **Activity trail.** Every sign in, view, download, share and removal is written by server code, so the browser cannot forge or delete entries. Owners see what others did to their documents.
- **Renewal reminders.** Give a document an expiry date and the vault flags it as it approaches.
- **Strong sign in.** Email and password with enforced verification, passwordless email links, and authenticator app (TOTP) two-step sign in.
- **Your data is yours.** Export your records and delete your account, which removes your files, keys and shares.

It is not end-to-end encrypted. The server holds the keys so that sharing and family access work. See [SECURITY.md](SECURITY.md).

## Stack

| Layer | Choice |
|---|---|
| Front end | Vite, vanilla ES modules, a small router and an escaping `html` template helper. No framework. |
| Auth | Firebase Authentication (password, email link, TOTP) |
| Data | Cloud Firestore with default-deny rules |
| Files | Cloud Storage (`inbox/` write-only, `vault/` server-only) |
| Server | Cloud Functions v2 (Node 22), region `asia-south1` |
| Secrets | Secret Manager (`VAULT_MASTER_KEY`) |
| Hosting | Firebase Hosting with a strict Content-Security-Policy |

```
src/            front end (views, services, components, styles)
functions/      Cloud Functions (encryption, access control, audit)
tests/          unit tests, security rules tests, end-to-end test
docs/           audit of the legacy code and the rebuild plan
```

## Run it locally

You need Node 22 and Java 21 or later (for the Firestore emulator).

```bash
npm install
npm --prefix functions install

# 1. a throwaway secret for local encryption
node -e "console.log('VAULT_MASTER_KEY='+require('crypto').randomBytes(32).toString('base64'))" > functions/.secret.local

# 2. point the app at the emulators
printf 'VITE_FIREBASE_PROJECT_ID=demo-vaultara\nVITE_USE_EMULATORS=true\n' > .env.local

# 3. run everything (two terminals)
npx firebase emulators:start --only auth,firestore,functions,storage --project demo-vaultara
npm run dev
```

Open http://localhost:5173. Emulated email links are printed in the emulator terminal.

## Tests

```bash
npm test                 # front end unit tests
npm run test:functions   # encryption, validation, access logic
npm run test:rules       # Firestore security rules on the emulator
node tests/e2e/smoke.mjs # full browser run against the emulators (needs Chromium)
npm run check            # style rules: no dash characters, no inline styles or handlers
```

The end-to-end test registers users, uploads and previews a document, verifies the stored bytes are ciphertext, checks that markup in a title cannot run, shares with another account (view only, then revoked), joins a family, and signs out.

## Deploy

1. Upgrade the Firebase project to the Blaze plan (Storage and Functions need it).
2. In the console, enable Email/Password and Email link sign in, and enable TOTP multi-factor (Identity Platform).
3. Set the master key. Generate 32 random bytes, base64 encoded, and keep a backup somewhere safe. Losing it makes every stored file unreadable.
   ```bash
   firebase functions:secrets:set VAULT_MASTER_KEY
   ```
4. Copy `.env.example` to `.env.local` (or set the variables in CI) with your web app config.
5. Deploy.
   ```bash
   npm run deploy
   ```

Notes:

- The Storage bucket and Functions region default to Mumbai (`asia-south1`). Change `REGION` in `functions/src/runtime.js`, `region` in `firebase.json` and `VITE_FUNCTIONS_REGION` together.
- Set an App Check provider and enable enforcement if you expect abuse. The functions already rate limit every sensitive action per user.
- Storage rules cannot be exercised by the local emulator in every environment. Test `storage.rules` once in a staging project.

## Handoff

Status, decisions, known gaps and next steps for the next maintainer are in [HANDOFF.md](HANDOFF.md).

## Legacy

The original 2025 build (vanilla pages on the compat SDK, files stored as Base64 in Firestore, rules that let any signed-in user read everything) is described in [docs/AUDIT.md](docs/AUDIT.md). The rebuild plan is in [docs/PLAN.md](docs/PLAN.md).

## Licence

See [LICENSE](LICENSE).
