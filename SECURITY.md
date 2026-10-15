# Security

Vaultara is in beta. Only the latest deployed version receives fixes.

## Reporting a vulnerability

Please report problems privately through the repository's security advisory page ("Report a vulnerability" under the Security tab). Do not open a public issue. Include steps to reproduce, and allow a reasonable time for a fix before publishing details. Please do not access data that is not yours.

## How the system protects documents

| Concern | Control | Where |
|---|---|---|
| Files at rest | AES-256-GCM, fresh random key per file, key wrapped by a master key from Secret Manager, ciphertext bound to the document and owner as additional data | `functions/src/crypto.js` |
| File type | Decided from the file's first bytes (PDF, JPEG, PNG, WebP, HEIC), never from the name or browser type | `functions/src/sniff.js` |
| Direct file access | `vault/` is closed to all clients. Files are served only by the `download` function after an access check | `storage.rules`, `functions/src/documents.js` |
| Metadata access | Default-deny rules. Reads need a verified email and an ownership, share or family relationship | `firestore.rules` |
| Writes | All writes to documents, shares, families and the audit log come from server code | `firestore.rules` |
| Sharing | By email to a verified account, view only or download, optional end date, revocable, expired shares removed hourly | `functions/src/sharing.js` |
| Family | Unguessable 8 character one-time codes (32^8 values), 48 hour expiry, 5 join attempts per hour, membership carried in a server-set claim | `functions/src/family.js` |
| Audit trail | Written only by functions with a masked IP and browser name. Readable by the actor and the document owner | `functions/src/runtime.js` |
| Sign in | Verified email required, password strength checks, passwordless link, TOTP second factor, password re-entry for sensitive actions | `src/services/auth.js` |
| Abuse | Per-user rate limits on uploads, downloads, shares, invites and joins | `functions/src/runtime.js` |
| Browser | Strict Content-Security-Policy with no inline scripts or styles, HSTS, frame denial, referrer and permissions policies. All dynamic markup is escaped by default | `firebase.json`, `src/lib/dom.js` |

The controls are covered by automated tests: unit tests for the cryptography and validation, 35 rules tests on the Firestore emulator, and an end-to-end browser test. See the README.

## Known limits (please read)

- **Not end-to-end encrypted.** The server must decrypt files so that sharing and family access work. Anyone who controls the deployed functions together with the master key could read stored files. Restrict who can deploy, who can read the secret, and who has project owner access.
- **View only is advisory.** It removes the download button and the server refuses attachment downloads, but a person who can view a document can still photograph their screen.
- **Master key loss is data loss.** Keep a secure backup. Key rotation is supported by the stored key version but no rotation job is shipped yet.
- **Account enumeration by sharers.** Sharing tells an authenticated, rate-limited user whether an email has an account. Password reset does not reveal this.
- **Storage rules** should be exercised once in a staging project, because the local Storage emulator's rules runtime is not available in every environment.
- Vaultara is not formally certified against any standard.

## Operational checklist for deployers

1. Enable Firebase App Check and enforce it for Firestore, Storage and Functions.
2. Limit project owners, enable audit logging in Google Cloud, and alert on Secret Manager access.
3. Turn on Identity Platform multi-factor and consider requiring it.
4. Review Firestore and Storage rules after every change with `npm run test:rules`.
5. Set a budget alert. Functions and Storage are billed.
