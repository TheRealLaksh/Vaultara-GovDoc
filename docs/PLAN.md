# Vaultara rebuild plan

Decisions agreed with the owner: Firebase kept and modernised, Cloud Storage with real encryption, server-held keys via Cloud Functions, Vite with vanilla JS modules, editorial and warm design, keep the Vaultara name, full rewrite plus new features, sign-in by email and password, email link, and TOTP second factor.

## Architecture

```
Browser (Vite SPA, modular Firebase SDK)
   |  Auth (password, email link, TOTP MFA)
   |  Firestore reads (own data only, rules enforced)
   |  Storage write to inbox/{uid}/{id} only
   v
Cloud Functions (Node 22, callable + one streaming HTTPS endpoint)
   |  finalizeUpload: validate, sniff magic bytes, envelope-encrypt, store, record
   |  downloadDocument (HTTPS): authorise, decrypt, stream, audit
   |  shares, family invites, account export and delete, audit events
   v
Firestore (documents, shares, families, invites, auditLogs, users)
Storage   (vault/ ciphertext, server only. inbox/ transient, write only)
Secret Manager (VAULT_MASTER_KEY)
```

### Envelope encryption

Each file gets a random 256-bit data key. The file is encrypted with AES-256-GCM (additional data = document id and owner id). The data key is wrapped with the master key (also AES-256-GCM, additional data = document id) and stored in `docKeys/{docId}`, a collection that clients can never read. The ciphertext lives in `vault/{ownerId}/{docId}.enc`, which Storage rules deny to every client. Plaintext only exists in function memory for the length of a request. Master key rotation is supported through a key version stored with each wrapped key.

### Data model

| Collection | Writer | Purpose |
|---|---|---|
| `users/{uid}` | client (name, preferences only) and server (familyId) | profile |
| `documents/{docId}` | server only | metadata: title, category, mime, size, sha256, expiry, tags, ownerId |
| `docKeys/{docId}` | server only, unreadable | wrapped data key |
| `shares/{docId_recipientUid}` | server only | active shares with permission and expiry |
| `families/{familyId}` | server only | name, owner, member uids |
| `familyInvites/{code}` | server only | one-time codes, 48 hour expiry |
| `auditLogs/{id}` | server only | immutable trail, readable by actor and document owner |
| `rateLimits/{key}` | server only | token buckets |

Clients may read what they are entitled to and write only their own profile fields. Everything privileged goes through Functions, which also write the audit log, so entries cannot be forged.

### Security controls

1. Firestore and Storage rules default-deny, tested with the emulator.
2. Email verification enforced in rules and in Functions.
3. Passwords: 10 plus characters, strength meter, reset flow, re-authentication before password change, delete and MFA changes.
4. TOTP second factor (Identity Platform) and passwordless email link.
5. Strict CSP without `unsafe-inline` for scripts, HSTS, frame-ancestors none, referrer and permissions policy.
6. All DOM output built with a safe templating helper that escapes by default (no raw `innerHTML` with user data).
7. File type decided by magic bytes on the server, size limit 15MB, filename sanitised.
8. Rate limits per user on uploads, shares, invites and downloads.
9. Downloads stream with `Content-Disposition` and `X-Content-Type-Options: nosniff`, never as a data URL.

### Features

Carried over: upload, categories, search and filter, share, family linking, activity history, profile.

New: encrypted storage up to 15MB, in-app preview for PDF and images, document expiry with "expiring soon" reminders, tags, share expiry and permission (view only or download), revoke and a sharing centre, family invites with codes and roles, document detail page with per-document activity, data export, account deletion, dark mode, keyboard shortcuts, toasts and confirm dialogs instead of alerts, installable PWA manifest.

### Front end

Vite, vanilla ES modules, tiny router, `html` tagged-template helper, a single design system in CSS custom properties.

Design language (editorial and warm): paper background, ink text, forest green as the single brand colour, vermilion for danger, ochre for warnings. Fraunces (display serif) with Instrument Sans for interface text, and a monospaced face for reference numbers. Documents are shown as index cards with a ruled edge and a rubber-stamp status. Custom SVG icon set and seal logo, no emoji. Light and dark themes.

### Delivery phases

1. Audit and plan (this document and AUDIT.md).
2. Backend: rules, indexes, Functions, rules and crypto tests.
3. Front end: shell, auth, vault, upload, detail, sharing, family, activity, settings, landing.
4. Verification: unit tests, rules tests on the emulator when available, production build, browser screenshots, accessibility pass.
5. Documentation refresh (README, SECURITY, PRIVACY, COMPLIANCE) so claims match the code, then push.

### Operational notes the owner must do once

- Upgrade the Firebase project to Blaze (Storage and Functions require it).
- Enable Email/Password and Email link sign-in, and TOTP MFA (Identity Platform) in the console.
- Set the secret: `firebase functions:secrets:set VAULT_MASTER_KEY` (32 random bytes, base64).
- Copy `.env.example` to `.env.local` and fill the web app config (not secret).
- `firebase deploy`.
