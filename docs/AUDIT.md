# Vaultara audit (legacy build, December 2025)

This is the audit of the original Vaultara code base (vanilla HTML/JS on the Firebase compat SDK, nine pages, about 2,000 lines). Every finding below is fixed by the rebuild. See [PLAN.md](PLAN.md) for how.

Severity: **Critical** (data exposure or loss), **High** (security or correctness defect), **Medium** (reliability, maintainability), **Low** (polish).

## 1. Security

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| S1 | Critical | Any signed-in user can read, edit and delete every document and every audit log. Rules are only `request.auth != null`. | `firestore.rules` |
| S2 | Critical | Files are not encrypted. The UI says "Encrypting & Processing" but the file is a plain Base64 data URL stored inside Firestore. Anyone who can read the database can read every document. | `upload.js` |
| S3 | Critical | Stored XSS. File titles, categories and log descriptions are written into the page with `innerHTML`. A document named `<img onerror=...>` runs in every viewer's session, including those it is shared with. | `dashboard.js`, `activity.js` |
| S4 | Critical | `fileData` is placed straight into an `href`. A crafted value (`javascript:` or a `data:text/html` URL) turns Download into script execution. | `dashboard.js` |
| S5 | High | Family IDs are `FAM-` plus 4 random digits (9,000 values), chosen by the client. Any user can type any code and join any family, and the rules do not check it. | `profile.js` |
| S6 | High | Audit log is written by the browser. Any user can forge or delete entries, so it is not an audit trail. | `logger.js` |
| S7 | High | Sharing writes an unverified email string into `sharedWith`. No check that the recipient exists, no case normalisation (`A@x.com` is not `a@x.com`), no expiry, no revoke, no view versus download permission. | `share.js` |
| S8 | High | Email verification is shown as a banner but never enforced, in the UI or in the rules. | `dashboard.js` |
| S9 | High | The page guard `checkAuth()` runs client-side only and races with first paint, so protected pages flash and can be read from the network tab. | `utils.js` |
| S10 | High | No Content-Security-Policy, HSTS, frame or referrer headers. Scripts load from a CDN with no integrity hashes. | `firebase.json` |
| S11 | Medium | Password policy is `length >= 6`. No reset flow, no second factor, no re-authentication before sensitive actions. | `otp.js` |
| S12 | Medium | Magic-number check is absent. The MIME type comes from the browser (`file.type`), so a renamed executable is accepted. | `upload.js` |
| S13 | Medium | No rate limiting on any action. | all |
| S14 | Medium | User can set their own profile fields, including `aadhaarLinked`, because the whole `users/{uid}` document is client-writable. | `firestore.rules`, `otp.js` |

## 2. Functional defects and dead code

| # | Sev | Finding |
|---|-----|---------|
| F1 | High | `register.html` is linked from the home page and from `checkAuth()` but does not exist. The Register button 404s. |
| F2 | High | `firebase.json` points at `storage.rules`, which does not exist, so `firebase deploy` fails. |
| F3 | High | `js/firebase-config.js` is gitignored and not documented, so a fresh clone cannot run at all. |
| F4 | High | Files over about 700KB (Base64 grows by a third) cannot be stored, because a Firestore document is limited to 1MiB. The 500KB cap is the app's real ceiling, which is too small for a scanned passport. |
| F5 | Medium | Dashboard issues three queries and merges client-side. When a document is both family and shared it shows the wrong badge. Sorting by `createdAt` crashes on a pending server timestamp. |
| F6 | Medium | `logout()` silently does nothing if the log write fails, because sign-out is chained after it. |
| F7 | Medium | Delete does a full page reload. It also deletes only the metadata; there is no cascade for shares or logs. |
| F8 | Medium | `activity.js` appends rows with `tbody.innerHTML +=` in a loop (quadratic, and re-parses earlier rows). |
| F9 | Medium | The activity query needs a composite index (`userId` + `timestamp`). `firestore.indexes.json` is empty, so the History page fails on a fresh project. |
| F10 | Low | Alerts and `confirm()` dialogs are used for all feedback. |
| F11 | Low | Dashboard counts all documents including ones shared with the user as "your documents". |
| F12 | Low | `otp.js` is named for a phone-OTP flow that was removed. `test-cases.md` still describes phone numbers and OTPs that no longer exist. |

## 3. Architecture and maintainability

- Nine HTML files each repeat the sidebar, script tags and Firebase CDN imports (compat SDK 9.6.1, now far behind).
- Global functions on `window` and inline `onclick` handlers prevent a strict CSP.
- No build step, no tests, no linting, no environments, no CI.
- Styling is a single 329 line stylesheet with many inline `style=""` attributes, duplicated colours and no design tokens.
- No dark mode, weak keyboard support, no focus styles audit, contrast untested, emoji used as icons.
- Documentation (README, SECURITY, COMPLIANCE, PRIVACY) claims encryption, immutable logs and consent features the code does not implement.

## 4. What was already good (kept)

- Product idea: a family-aware document locker with a visible audit trail.
- Categories (Identity, Education, Health) and the three-way view of owned, shared and family documents.
- Privacy documents (PRIVACY.md, COMPLIANCE.md) as a starting point. They are updated to match reality.
