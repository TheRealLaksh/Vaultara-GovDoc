# Vaultara (GovDoc) handoff

## Project
Privacy-first citizen document vault (Dec 2025 beta). Vanilla JS front end in `public/`, Firebase Auth (email/password) + Cloud Firestore; files stored as Base64 in Firestore (500 KB cap). Laksh's own project (TheRealLaksh).

## Links
- Repo: https://github.com/TheRealLaksh/Vaultara-GovDoc (main)
- Firebase project: `gov-docs-b2a1f` (Spark plan), console https://console.firebase.google.com/u/0/project/gov-docs-b2a1f/overview
- Local path: `C:\Users\laksh\OneDrive\Documents\Vaultara-GovDoc` (cloned 16 Oct 2026)
- **Live: https://vaultara.lakshpradhwani.com** (deployed 16 Oct 2026). Vercel project `vaultara` (team lakshs-projects-199ab745, Hobby), GitHub-linked, every push to `main` deploys to production. DNS: Cloudflare CNAME `vaultara` -> `11e22fe3f7da9dc2.vercel-dns-017.com` (DNS only, like the other Vercel subdomains).
- Firebase Hosting is not used.

## Deploy
- `vercel.json` serves `public/`, build command `node scripts/gen-config.mjs` writes `public/js/firebase-config.js` from the `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` Vercel env vars (web config values, plain type, not secrets). The file stays gitignored.
- Headers (vercel.json): nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS, and `Content-Security-Policy-Report-Only` (NOT enforced yet). To enforce: check the browser console on a signed-in session at the live site for violations (dashboard, upload, share, profile, activity), fix any, then rename the header key to `Content-Security-Policy`. The inline `js` class script in `index.html` is allowed by hash; if that script changes, recompute its sha256 in vercel.json.

## Run locally
- `public/js/firebase-config.js` is gitignored and must exist. It holds the web app config (Firebase console > Project settings > Your apps > Config) plus `firebase.initializeApp`, `const auth`, `const db`. Recreated 16 Oct 2026.
- Serve `public/` on port 5000: `python -m http.server 5000 --directory public` (or `firebase serve`). Open http://localhost:5000.
- No build step, no tests in repo.

## Code map
- `public/*.html`: index (landing), login (sign in + create account, one form), dashboard, upload, share, profile, activity.
- `public/js/`: `otp.js` (auth form), `auth.js` (logout), `shell.js` (builds sidebar and mobile nav on every signed-in page), `dashboard.js` (3 queries: owned, shared via `sharedWith` array-contains email, family via `familyId`; filters kept in the URL), `upload.js`, `share.js`, `profile.js` (Family ID), `activity.js` + `logger.js` (audit `logs`), `utils.js` (escapeHtml, Family ID helpers, `toast`, `confirmDialog`, `setStatus`), `landing.js` (scroll reveal, hero motion pause).
- `public/css/style.css` (design system + app), `public/css/landing.css` (landing only). `public/vendor/phosphor/` = self-hosted Phosphor Bold icons (MIT). `public/favicon.svg`.
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`.

## Design system ("warm paper", redesigned 16 Oct 2026)
- Direction chosen by Laksh via poll: warm paper editorial, slim left sidebar, proper one-page landing.
- Tokens in `:root` of `style.css`: paper `#F6F3EC`, sidebar `#EEEAE0`, ink `#1E1C18`, one accent deep green `#1F5C46`, pastel tints per category (Identity blue, Education yellow, Health rose, Family lilac). Fonts: Newsreader (display) + Geist (UI) from Google Fonts; icons Phosphor Bold. No emoji, no gradients, no glows, no shadows at rest. Sentence case copy.
- Hero background: 8 flat document sheets drifting slowly (CSS transform only), has a Pause control, stops under `prefers-reduced-motion`.
- Skills used: taste-skill (installed in the project at `.claude/skills` and `.agents`, excluded from git via `.git/info/exclude`), ui-ux-pro-max, web-design-guidelines. `inspect.mjs` on the landing page: 0 FAIL, 4 WARN (cream palette = chosen direction; font-size count; no photos/footage = animation used instead).
- Preview without a real account: a throwaway stub server lives in the Claude scratchpad (serves `public/` on :5001 with a fake signed-in user and sample documents; query flags ?unverified=1 ?empty=1 ?legacyfam=1 ?fail=1). Not part of the repo.

## Status (16 Oct 2026)
- Full audit done, see `AUDIT.md` (12 findings: 2 critical, 3 high, 3 medium).
- Local config restored; Firebase initialises on the local site, auth guard redirects, no console errors.
- Code fixes committed and pushed to main (16 Oct 2026, commits 2c8399f..c2ab2a6): XSS escaping and safe download links, verified-email handling on dashboard, 16-char Family IDs, upload type/size checks, stronger register password and auto verification email, invalid-credential message, lowercase sharing, dead link, firebase.json.
- `firestore.rules` rewritten (owner / shared / family, verified email, field allow-lists, append-only logs) and passed 50 emulator tests (test file kept outside the repo, in the Claude scratchpad).
- `firestore.indexes.json` now has the `logs` (userId, timestamp desc) index the Activity page needs.
- APPLIED to the live project 16 Oct 2026 (Laksh approved): new Firestore rules published (release 'Today 11:34 am'); `logs` (userId asc, timestamp desc) composite index created (was still Building when last checked); password policy set to Require enforcement, min length 8. Still open: API key website restriction (needs final domain), App Check, Hosting + headers.
- Full UI redesign done 16 Oct 2026 (see Design system). All screens checked at 1440 and 390 wide against a stub, plus the real login page and auth redirect against the real project. Login/register/upload/share still not tested end to end with a real account (Claude may not create accounts; ask Laksh).
- Fixed along the way: profile Family ID input had `maxlength="10"`, which would have cut the new 20-character IDs (now 36).

## Next steps
1. Laksh registers/signs in a throwaway account himself on http://localhost:5000 (Claude may not create accounts or type passwords, since Firebase Auth is not local), then Claude drives upload, share, family link, delete via Claude in Chrome. Nothing has been run end to end yet ( old test users have 4-digit Family IDs that no longer grant access, and need a new one from Profile > Generate).
2. Check the `logs` index finished building (Firestore > Indexes), then open the Activity page.
3. (Done) committed in 6 topic commits and pushed to main.
4. Restrict the browser API key to websites: https://vaultara.lakshpradhwani.com/*, http://localhost:*/*, and the Firebase auth handler https://gov-docs-b2a1f.firebaseapp.com/* (+ .web.app). Test with a credential-free call to identitytoolkit (expect INVALID_ID_TOKEN, not API_KEY_HTTP_REFERRER_BLOCKED). Then enforce the CSP (see Deploy) and consider App Check.
5. Replace shared-secret Family IDs with an invite/approve `families` collection.

## Open questions
- Add https://vaultara.lakshpradhwani.com to Firebase Authentication > Authorised domains if email links or OAuth are ever added (not needed for plain email/password).
- Any real citizen data in the 5 existing docs? (They look like Dec 2025 test uploads.)

## Decisions not to undo
- Base64-in-Firestore storage (no Firebase Storage) is by design; Storage rules removed from `firebase.json` because the app does not use Storage.
- Never commit `public/js/firebase-config.js`.

## Session log
- 2026-10-16: Cloned repo, rebuilt `firebase-config.js` from the console, audited Firebase, wrote tighter Firestore rules (emulator-tested, staged, not published), fixed email-case sharing, dead register link, firebase.json storage ref. Created this file.
- 2026-10-16 (later): full audit (AUDIT.md), rules v2 (50 emulator tests), XSS/validation/verification/Family ID fixes in app code, logs index file. Console changes still pending approval.
- 2026-10-16 (later still): Laksh approved console changes; published rules, created logs index, set password policy (enforced, min 8).
- 2026-10-16 (end): re-read the live rules in the console and confirmed the active release matches firestore.rules (same 116 lines). Did not create a test account (policy: not allowed for Claude); end-to-end test waits for Laksh to sign in.
- 2026-10-16 (final): committed in 6 topic commits and pushed to main (Laksh chose small commits + push). No auto-deploy, so nothing went live from the push.
- 2026-10-16 (redesign): whole UI redesigned (warm paper system, app shell, landing page with animated document-sheet hero background, toasts and confirm dialog instead of alert/confirm, skeleton/empty/error states, filters in URL, Phosphor icons self-hosted). Committed in 8 topic commits (52d3f39..021fe5c) and pushed to main with Laksh's OK; no auto-deploy, nothing went live.
- 2026-10-16 (deploy): Laksh chose Vercel + vaultara.lakshpradhwani.com. Added scripts/gen-config.mjs and vercel.json, created Vercel project `vaultara` (GitHub-linked, env vars set), added the domain, Cloudflare CNAME added with Laksh's approval. Live over HTTPS with headers; CSP is report-only. Signed-in end-to-end test still pending Laksh signing in.
