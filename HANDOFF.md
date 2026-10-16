# Handoff: Vaultara rebuild

Written 16 October 2026 for whoever picks this up next (a person or another Claude session). Read this first, then `README.md`, then `docs/AUDIT.md` and `docs/PLAN.md` if you want the reasoning.

## 1. One paragraph summary

"Walter" was the owner's name for their old project, which is this repository (`TheRealLaksh/Vaultara-GovDoc`). It was a vanilla HTML/JS document locker on Firebase with serious security holes. It has been audited and fully rebuilt: a Vite single page app on the front end and Cloud Functions on the back end that encrypt every file, check every access on the server and write a tamper-proof audit trail. The rebuild is committed and pushed to branch `claude/pensive-hopper-nyhoqp` (commit `58e8cb1`). It has **never been deployed** to a real Firebase project. It has been run end to end only against the local Firebase emulators.

## 2. Status at handoff

| Item | State |
|---|---|
| Branch | `claude/pensive-hopper-nyhoqp`, pushed, working tree clean |
| Pull request | **Not opened.** The owner did not ask for one. Open one only when asked. |
| Deployed | No. No real Firebase project was touched. |
| Front end unit tests | 13 pass (`npm test`) |
| Backend unit tests | 27 pass (`npm run test:functions`) |
| Security rules tests | 35 pass on the Firestore emulator (`npm run test:rules`) |
| Browser end to end | 27 steps pass against the emulators (`node tests/e2e/smoke.mjs`) |
| Production build | passes (`npm run build`), main chunk 52 kB, Firebase chunk 593 kB |
| Style check | passes (`npm run check`) |
| CI workflow | written (`.github/workflows/ci.yml`), **never run on GitHub** |

## 3. What the owner asked for, and what they decided

The owner's original request, paraphrased: do a very deep audit of the old project, plan it in detail without waiting for approval, completely redesign the UI and backend, make it fully functional and "authentic", **do not use em dashes**, make it aesthetically good, and ask clarifying questions only through a poll. They then said they were going to sleep and gave full access.

Decisions made through the polls (treat these as settled, do not re-ask):

| Topic | Decision |
|---|---|
| Which repo is "Walter" | It is Vaultara-GovDoc |
| Visual direction | Editorial and warm (paper, ink, forest green, serif display type) |
| Backend | Keep Firebase and modernise it |
| Scope | Full rewrite **plus new features** |
| Name | Keep "Vaultara" |
| File storage | Cloud Storage, encrypted (needs Blaze plan) |
| Encryption model | Server-held keys through Cloud Functions (not end-to-end) |
| Front end tooling | Vite with vanilla JS modules, no framework |
| Sign in methods | Email and password with verification, email link, authenticator app (TOTP) |

Standing rules from the owner:

1. **No em dashes or en dashes anywhere**, in code, copy, docs or chat replies. `npm run check` enforces this for the repo.
2. Must "look very authentic" and aesthetically good.
3. Do not create a pull request unless asked. Develop on `claude/pensive-hopper-nyhoqp` only.
4. Plain, honest claims. The product copy states plainly that it is not end-to-end encrypted.

## 4. Architecture

```
Browser (Vite SPA, Firebase modular SDK v12)
  Auth: password, email link, TOTP second factor
  Firestore: reads only, own data, enforced by rules
  Storage: can only create inbox/{uid}/{id}
        |
        v
Cloud Functions v2, Node 22, region asia-south1
  callables: finalizeUpload, updateDocument, deleteDocument, shareDocument,
             revokeShare, createFamily, createInvite, revokeInvite, joinFamily,
             leaveFamily, removeFamilyMember, disbandFamily, recordSession,
             exportMyData, deleteMyAccount
  HTTPS:     download  (GET /api/download?id=&disposition=inline|attachment)
  schedule:  housekeeping (hourly)
        |
        v
Firestore    documents, docKeys, shares, families, familyInvites,
             auditLogs, users, rateLimits
Storage      inbox/ (write-only for the owner), vault/ (server only)
Secret Mgr   VAULT_MASTER_KEY (32 bytes, base64)
```

### Upload and read flow

1. Browser generates a random 24 character id, uploads the file to `inbox/{uid}/{id}` (rules: verified email, 1 byte to 15MB, create only).
2. Browser calls `finalizeUpload({uploadId, title, category, tags, expiresOn, familyShared})`.
3. Function downloads the inbox file, sniffs the real type from magic bytes (PDF, JPEG, PNG, WebP, HEIC), encrypts it, writes ciphertext to `vault/{ownerId}/{docId}.enc`, writes `documents/{docId}` and `docKeys/{docId}`, deletes the inbox copy, writes an audit entry. The document id is the upload id.
4. To open a file the browser calls `GET /api/download` with `Authorization: Bearer <ID token>`. The function verifies the token (with revocation check), requires a verified email, loads the document, decides access with `accessFor` (`functions/src/access.js`), decrypts, writes an audit entry and returns the bytes. The browser turns them into a blob URL for preview or download. No file ever has a public URL.

### Envelope encryption (`functions/src/crypto.js`)

- Per file: random 32 byte data key, AES-256-GCM, 12 byte random IV, additional data `file:{ownerId}:{docId}`.
- The data key is wrapped with the master key, also AES-256-GCM, additional data `key:{docId}`, stored in `docKeys/{docId}` with `version: 1`.
- Blob layout: `version(1) | iv(12) | tag(16) | ciphertext`.
- A ciphertext copied to another document or owner fails to decrypt. Tests cover wrong doc, wrong owner, wrong master key, tampering, truncation and unknown version.

### Data model

| Collection | Written by | Notes |
|---|---|---|
| `users/{uid}` | server creates (`recordSession`). Client may update only `displayName`, `theme`, `updatedAt` | `familyId` is server-only |
| `documents/{docId}` | server only | `ownerId, title, category, tags[], mimeType, extension, size, sha256, expiresAt, familyId, familyShared, sharedWithUids[], createdAt, updatedAt` |
| `docKeys/{docId}` | server only, no client read | wrapped data key |
| `shares/{docId_recipientUid}` | server only | `docId, docTitle, ownerId, ownerEmail, recipientUid, recipientEmail, permission (view or download), expiresAt, createdAt` |
| `families/{familyId}` | server only | `name, ownerId, memberUids[], members{uid:{name,email,role,joinedAt}}` |
| `familyInvites/{CODE}` | server only | 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, `familyId, createdBy, used, expiresAt` |
| `auditLogs/{id}` | server only | `actorId, actorEmail, ownerId, subjects[actor, owner], action, docId, docTitle, detail, ip (masked), userAgent, createdAt` |
| `rateLimits/{uid_action}` | server only | fixed window counters |

Why `sharedWithUids` is denormalised onto the document, and why family access uses a custom claim: Firestore must be able to prove a list query is allowed from the query constraints alone. `array-contains uid` and a comparison with `request.auth.token.familyId` both qualify. A `get()` of another document inside a rule does not reliably qualify, so it is not used. The rules tests include the query shapes.

### Function catalogue and limits

| Function | Who | Limits and rules |
|---|---|---|
| `finalizeUpload` | verified user | 30 per hour, 15MB, type sniffed, memory 1GiB, 120 s |
| `updateDocument` | owner | title, category, tags, expiry, family visibility (needs a family) |
| `deleteDocument` | owner | removes ciphertext, key, shares, document |
| `download` (HTTPS) | owner, share recipient, family member | 120 per hour. Attachment refused if share permission is `view`. 401 no token, 403 unverified or not allowed to download, 404 no access, 400 bad id |
| `shareDocument` | owner | 40 per hour, 1 to 365 days or none, recipient must have a verified account, cannot share to self |
| `revokeShare` | owner or recipient | removes share and the uid from `sharedWithUids` |
| `createFamily` | any verified user without a family | sets `familyId` claim |
| `createInvite` | family owner | 20 per hour, max 5 open invites, max 8 members, 48 hour expiry |
| `joinFamily` | verified user without a family | **5 attempts per hour**, transactional, one-time code |
| `leaveFamily`, `removeFamilyMember`, `disbandFamily` | member, owner, owner | clears claim, sets that person's `familyShared` documents back to private |
| `recordSession` | signed in (verified not required) | creates profile if missing, writes login or register audit entry, 60 per hour |
| `exportMyData` | verified user | 5 per hour, JSON of profile, documents, shares, last 500 audit entries. No keys, no files |
| `deleteMyAccount` | verified user | needs sign in within 5 minutes (`auth_time`) and `confirm: "DELETE"`. Blocks if you own a family with other members |
| `housekeeping` | scheduler | hourly: removes expired shares and invites, old rate limit counters |

### Front end layout

```
src/main.js            boots, defines routes and the route guard, mounts shell or public page
src/lib/               dom.js (escaping html``, delegate, forms), router.js, store.js,
                       format.js, icons.js (SVG set and logo), password.js
src/services/          firebase.js (init, emulator wiring), auth.js, vault.js, sharing.js,
                       family.js, activity.js, account.js, api.js (callable wrapper)
src/components/        shell.js (sidebar app layout), modal.js (native dialog), toast.js,
                       doc-card.js, event.js, share-dialog.js, tags.js
src/views/             one file per route, default export is the view function
src/styles/            tokens.css, base.css, components.css, layout.css, site.css
```

Routes (all lazy loaded): `/`, `/login`, `/register`, `/forgot`, `/verify`, `/privacy`, `/security`, `/app`, `/app/upload`, `/app/documents/:id`, `/app/sharing`, `/app/family`, `/app/activity`, `/app/settings`, `/404`. Guards: `app` needs a signed in, email verified user (unverified goes to `/verify`), `guest` redirects verified users to `/app`, `verify` is only for signed in unverified users.

Design tokens live in `src/styles/tokens.css`. Light: paper `#f5f0e6`, ink `#1d1b16`, brand forest green `#1e4d3b`, danger `#a83a24`. Dark theme is defined twice (explicit `data-theme="dark"` and `prefers-color-scheme` when no explicit light). Fonts: Fraunces (display), Instrument Sans (body), IBM Plex Mono (references), loaded from Google Fonts with system fallbacks.

## 5. Conventions you must keep

- **No dash characters** (em or en) in any file. Use commas, colons, "to", or rewrite. `npm run check` fails the build on them.
- **No inline `style=""`, no inline `on*=` handlers, no inline scripts.** The Content-Security-Policy in `firebase.json` blocks them (`script-src 'self'`, `style-src 'self'` plus Google Fonts). Set dynamic styles from JS (`el.style.setProperty`), and wire events with `delegate()` and `data-action`.
- **Never concatenate user data into markup.** Use the `html` tagged template, which escapes everything except nested `html` results and `raw()`. Never pass user data to `raw()`.
- **Action names must be unique across nested delegates.** The shell listens on the whole app wrapper, so its actions are prefixed `shell-`. A view action called `theme` once collided with the sidebar toggle and both fired.
- **Keep the `<main id="view">` element stable.** Views hold a reference to it. The shell repaints its chrome and swaps the same `<main>` node back in. If you change `shell.js`, preserve that, or views render into a detached node (this was a real bug).
- **All privileged writes go through Functions.** Do not loosen `firestore.rules` to allow client writes to documents, shares, families, invites or audit logs. Every new feature that needs one gets a callable with `requireVerified`, validation from `validate.js`, a rate limit where abuse is possible, and an `audit()` call.
- Validation is centralised in `functions/src/validate.js`. Add new input checks there with tests.
- Money, dates and copy: British-ish English, `en-IN` date formatting.

## 6. Run, test, deploy

### Local development (everything needs Node 22 and Java 21 or later)

```bash
npm install && npm --prefix functions install
node -e "console.log('VAULT_MASTER_KEY='+require('crypto').randomBytes(32).toString('base64'))" > functions/.secret.local
printf 'VITE_FIREBASE_PROJECT_ID=demo-vaultara\nVITE_USE_EMULATORS=true\n' > .env.local

npx firebase emulators:start --only auth,firestore,functions,storage --project demo-vaultara   # terminal 1
npm run dev                                                                                   # terminal 2, http://localhost:5173
node tests/e2e/smoke.mjs                                                                      # terminal 3, optional
```

`functions/.secret.local` and `.env.local` are gitignored and exist only on whichever machine created them. The e2e script launches `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` by default. Override with `CHROMIUM=...`. Screenshots go to `/tmp/claude-0/screens` (override with `SHOTS=...`). The Vite dev server proxies `/api/download` to the Functions emulator, and production uses a Hosting rewrite to the same function.

`npm run test:rules` starts its own Firestore emulator on port 8080, so **stop any running emulator stack first** or the port will be taken.

### Production deploy checklist

1. Upgrade the Firebase project to **Blaze**.
2. Console: enable Email/Password, Email link, and TOTP multi-factor (Identity Platform).
3. `firebase functions:secrets:set VAULT_MASTER_KEY` with 32 random bytes, base64. **Back this key up securely. Losing it makes every file unreadable.**
4. Create `.env.local` (or CI variables) from `.env.example`. Use the real `VITE_FIREBASE_STORAGE_BUCKET`, which is `<project>.firebasestorage.app` on new projects and `<project>.appspot.com` on older ones.
5. `npm run deploy` (builds, then `firebase deploy` for hosting, functions, firestore rules and indexes, storage rules).
6. Add the Firestore composite indexes if the deploy skips them: `auditLogs (subjects array-contains, createdAt desc)` and `auditLogs (docId asc, subjects array-contains, createdAt desc)`. They are defined in `firestore.indexes.json`.
7. Add the deployed domain to Auth authorised domains so email links work.
8. Change `REGION` in `functions/src/runtime.js`, `region` in the `firebase.json` rewrite and `VITE_FUNCTIONS_REGION` together if you do not want `asia-south1`.

## 7. Known gaps and risks, in priority order

These are honest, found-by-me issues. None has been fixed unless stated.

**P1: security**

1. **Removed family members keep access for up to an hour.** Family visibility is driven by the `familyId` custom claim. After `removeFamilyMember`, `leaveFamily` or `disbandFamily`, the person's existing ID token still carries the old claim until it refreshes (up to 1 hour). Firestore rules (metadata) and the `download` function (`decoded.familyId`) both trust that claim. Suggested fix: in `download`, read `users/{uid}.familyId` from Firestore instead of the token claim, and call `auth.revokeRefreshTokens(uid)` in `removeMember`. Rules would still expose document metadata (not file contents) for the remainder of the token life, so also consider removing the claim dependency in rules by denormalising a `familyMemberUids` array onto documents.
2. **`storage.rules` has never been executed.** The local Storage emulator could not download its rules runtime in the sandbox ("Unexpected rules runtime error"), so uploads in the e2e test ran without rule enforcement. Test `storage.rules` once on a staging project: a verified user can create `inbox/{ownUid}/{20 to 40 char id}` up to 15MB, and nothing else (no read, overwrite, delete, other uids, or `vault/`).
3. **TOTP and email link sign in are unverified.** The code and screens exist (`src/services/auth.js`, `src/views/login.js`, `src/views/settings.js`), but they were not exercised because they need Identity Platform and a real mailbox. Test on a staging project.
4. **App Check is not enforced.** Rate limits exist per user, but there is no per-IP or bot protection. Enable App Check and enforcement.
5. **No master key rotation job.** The key version is stored (`version: 1`) but nothing re-wraps keys. Write a one-off admin script before you need it.

**P2: correctness and product**

6. Expired shares still allow reading document **metadata** in Firestore until `housekeeping` runs (at most an hour). The `download` function checks expiry exactly, so file contents are never exposed late.
7. `leaveFamily` by a sole owner deletes the family but does not delete that family's open invites (only `disbandFamily` does). Invites then fail at join with "no longer exists". Harmless, but clean up.
8. The vault loads every document the person can see in one go. Fine for hundreds, add pagination or virtual lists before thousands.
9. `download` holds the whole decrypted file in memory (15MB cap, 1GiB function). Fine at this size.
10. The expiry reminders are in-app only (banner in the vault). No email or push. A scheduled function plus an email provider would be the next step.
11. Account deletion is blocked while you own a family with other members, by design, but the error is only shown in the dialog text from the server.
12. The Hosting rewrite to the `download` function has a 60 second limit. Large downloads on slow links could hit it. Fine at 15MB.
13. Audit entries are removed with the actor's account, but the owner's copy of entries about other people's actions on their documents stays until the owner is deleted. Document this if a regulator asks.

**P3: quality**

14. Accessibility has been designed for (native dialogs, labels, focus rings, `aria-*`, reduced motion, 4.5:1 text contrast on the main palette) but **not audited** with a screen reader or an automated tool. Run an axe or Lighthouse pass.
15. The PWA manifest exists but there is no service worker, so it is installable but not offline.
16. The e2e test is not part of CI (it needs emulators, a built dev server and Chromium). Wiring it into CI would be valuable.
17. The CI workflow has never run. Expect small fixes on first run (for example the Firestore emulator download step).
18. Fonts load from Google Fonts. For stricter privacy, self-host them and tighten the CSP (`font-src 'self'`).
19. No i18n. Copy is English only.
20. Vault, document and sharing views are the largest files (about 200 lines each). They could be split further if they grow.

## 8. Things that cost time, so you do not repeat them

- **`firebase@13` conflicts with `@firebase/rules-unit-testing@5`** (peer wants `firebase@^12`). The project is pinned to `firebase@12`. If you upgrade, check the rules tests still run.
- **Duplicate `@firebase/app-compat` copies** made the rules test helper fail with `this.getApp(...).firestore is not a function`. `npm dedupe` fixed it. If you see that error after an install, run `npm dedupe`.
- `@firebase/rules-unit-testing` returns **compat** Firestore objects, so `tests/rules.test.js` has small helper functions that wrap compat calls to look like modular ones.
- **The Vite dev proxy must keep the query string.** The first version rewrote `/api/download?id=...` to a fixed path and dropped `?id=`, which looked like a server bug (`Document id is invalid`). It now appends everything from `?` onward.
- **Do not use `pkill -f` with patterns that appear in your own command line.** It killed the shell session once. Select PIDs with the bracket trick (`grep -E "[f]irebase emulators:start"`) and `kill`.
- Playwright can only be imported from a directory inside the project (it is a dev dependency). Scripts in `/tmp` fail to resolve it, so temporary scripts were copied into `scripts/` and deleted afterward.
- Several e2e failures during development were test races, not product bugs: `waitForURL` resolves as soon as `pushState` runs, before the new view renders. Wait for a view specific selector (for example `.preview`) before asserting content.
- The Functions emulator reloads function source on change but the Auth and Storage emulators log scary "was not triggered due to emulation error" warnings for background triggers that this project does not use. Ignore them.
- The emulator hub warns about `::1` ports (`EAFNOSUPPORT`) in the sandbox. Harmless, it falls back to IPv4.

## 9. File inventory (tracked, 6,900 lines of source and tests)

```
.github/workflows/ci.yml      CI: check, unit, functions, rules, build
.env.example                  web app config template (public identifiers, not secrets)
firebase.json                 hosting (CSP and headers, /api/download rewrite), functions, emulators
firestore.rules               default deny, verified-email reads, server-only writes
firestore.indexes.json        two auditLogs composite indexes
storage.rules                 inbox create-only, everything else denied
index.html, vite.config.js    SPA shell, dev proxy
public/                       favicon, manifest, robots, theme.js (pre-paint theme, CSP safe)
functions/src/                crypto, sniff, validate, access, runtime (admin, rate limit, audit),
                              documents, sharing, family, account, scheduled, index
functions/test/               27 unit tests
src/                          see section 4
tests/unit/                   13 front end unit tests
tests/rules.test.js           35 Firestore rules tests (emulator)
tests/e2e/smoke.mjs           27 browser steps against the emulators
scripts/check-text.mjs        dash, inline style and inline handler check
docs/AUDIT.md, docs/PLAN.md   legacy audit and rebuild plan
README.md, SECURITY.md, PRIVACY.md, COMPLIANCE.md   rewritten so claims match the code
HANDOFF.md                    this file
```

The old `public/*.html`, `public/js/*`, `public/css/style.css` and `test-cases.md` were deleted. They remain in git history before commit `58e8cb1`.

## 10. Suggested next steps

1. Fix gap 1 (family claim staleness). It is small and closes the one real access-control hole I know of.
2. Create a staging Firebase project, deploy, then verify gaps 2 and 3 by hand (storage rules, TOTP, email link).
3. Run the CI workflow on GitHub and fix first-run issues.
4. Open a pull request from `claude/pensive-hopper-nyhoqp` to `main` when the owner says so.
5. Add App Check, then run an accessibility pass and add the e2e test to CI.
6. Then product work: expiry reminder emails, document versions or replace-file, pagination, a key rotation script.

## 11. How to verify the work quickly

```bash
git checkout claude/pensive-hopper-nyhoqp && npm install && npm --prefix functions install
npm run check && npm test && npm run test:functions && npm run build
npm run test:rules                      # with no emulator already running
```

Then start the emulators and the dev server (section 6) and run `node tests/e2e/smoke.mjs`. All 27 steps should print `PASS`. Open http://localhost:5173 and register an account to see the app. In the emulator, the email verification link is printed in the emulator terminal, or open the Auth emulator UI at http://localhost:4000/auth.
