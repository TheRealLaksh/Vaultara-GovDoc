# Vaultara Firebase audit (16 Oct 2026)

Project `gov-docs-b2a1f` (Spark plan). Audited in the Firebase and Google Cloud consoles plus a read of all app code. The five documents and the test accounts in the project all date from Dec 2025 and look like test data.

## Findings

| # | Severity | Finding | Fix | Status |
|---|----------|---------|-----|--------|
| 1 | Critical | Published Firestore rules let any signed-in user read, edit and delete every document, log and profile. | New owner / shared / family rules in `firestore.rules`. | Published to the live project 16 Oct 2026 (50 emulator tests passed first). |
| 2 | Critical | Stored XSS: `fileName`, `category` and the download link were put into `innerHTML` unescaped, so a user could share a document that runs script in the recipient's session. | `escapeHtml`, `isSafeDataUrl`, no inline `onclick` in `dashboard.js`; activity log escaped; rules only accept PDF/JPEG/PNG data URLs. | Fixed in code and rules. |
| 3 | High | Anyone could register a victim's email (no verification needed) and read everything shared to it. | Rules require `email_verified` for shared and family reads; verification email sent on register; dashboard refreshes the token after verifying. | Fixed in code and rules. |
| 4 | High | Family ID was `FAM-` plus 4 digits and self-asserted, so anyone could brute-force 9,000 codes and read a family's documents. | 16-character random IDs (`crypto.getRandomValues`); rules reject IDs shorter than 12 characters. Old 4-digit IDs stop granting access. | Fixed in code and rules. |
| 5 | High | Activity page query needs a composite index that did not exist, so the page errors. | Index added to `firestore.indexes.json`. | Index created in the console 16 Oct 2026 (building at last check). |
| 6 | Medium | Client could write any fields: any category, any `fileData`, extra fields, forged log timestamps, `aadhaarLinked: true`. | Field allow-lists, size limits, `createdAt == request.time`, log action allow-list, `aadhaarLinked` must stay false. | Fixed in rules. |
| 7 | Medium | Browser API key has no website restriction (only an API allow-list). | Restrict to the real site domains plus `localhost`. | **Open**, needs the final domain. |
| 8 | Medium | Password policy: 6 characters, no complexity, "notify" mode. | Register form now needs 8+ with a letter and a number. Console policy should be set to match. | Fixed: code requires 8+ with a letter and a number; console policy set to enforce min length 8 (16 Oct 2026). |
| 9 | Low | Login error messages for wrong password / unknown user never fire because email-enumeration protection is on (good). | Handle `auth/invalid-credential`. | Fixed in code. |
| 10 | Low | Sharing stored mixed-case emails, which never matched the lowercase auth email. | Lowercase on share and on the dashboard query. | Fixed in code. |
| 11 | Low | Dead `register.html` link and `firebase.json` pointing at a missing `storage.rules`. | Link now goes to `login.html`; storage block removed (app does not use Storage). | Fixed. |
| 12 | Info | App Check not enabled; no Hosting deploy; no Firestore backups (Spark plan); no CSP/security headers. | See next steps. | Open. |

Fine as found: one project owner, no stray members, email-enumeration protection on, authorised domains are only localhost and the two Firebase defaults, Email/Password is the only provider.

## Remaining design limits
- Family membership is a shared secret. Anyone who learns a family's ID and puts it on their profile can read that family's documents. A proper fix is an invite-and-approve `families` collection.
- Files are Base64 in Firestore (500 KB cap), not encrypted at rest beyond Google's default. The README's "encrypted" wording overstates this; client-side encryption or Cloud Storage would be needed for real confidentiality.
- Audit logs are written by the client, so they are tamper-proof after the fact but not proof of server-side events.

## Next steps
1. Confirm the `logs` index has finished building.
2. (Done 16 Oct) rules published, index created, password policy enforced.
3. Restrict the API key to the deployed domain(s) once hosting is chosen.
4. Deploy to Firebase Hosting with security headers (CSP, `X-Frame-Options`, `Referrer-Policy`) and turn on App Check.
5. Test end to end with a throwaway account: register, verify, upload, share, family link, delete.
