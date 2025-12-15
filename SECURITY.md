# 🔐 Security Policy — Vaultara (GovDoc)

Vaultara is designed with a **privacy-first, security-centric architecture** to protect sensitive citizen documents and identity data.  
This document outlines our security practices, supported versions, and responsible vulnerability disclosure process.

---

## 🛡️ Supported Versions

Vaultara is currently in **BETA**.

| Version | Status | Security Updates |
|--------|--------|------------------|
| Beta   | ✅ Supported | Active fixes & monitoring |
| Legacy builds | ❌ Unsupported | No security patches |

Only the latest deployed version is actively maintained.

---

## 🔒 Security Architecture Overview

Vaultara employs **multi-layered security controls** across the client, backend, and database layers.

### 🔐 Authentication
- Firebase Authentication (Email & Password)
- Mandatory email verification for full access
- Session-based access enforcement
- Identity-bound document ownership

### 🧾 Authorization
- Owner-based access control (`ownerId`)
- Granular document sharing permissions
- Family-based inheritance using `familyId`
- Explicit self-share prevention logic
- Delete privileges restricted to document owners only

### 🗂️ Data Storage Model
- Documents stored as **Base64-encoded strings** inside Cloud Firestore
- No raw files stored in public object storage
- Strict client-side file size enforcement (≤ 500 KB)
- Structured metadata separation from content

---

## 🧠 Audit Logging & Traceability

Vaultara maintains **immutable audit logs** for all high-risk operations:

Tracked events include:
- `LOGIN`
- `UPLOAD`
- `SHARE`
- `DELETE`
- `FAMILY_LINK`

Each event records:
- Server-side timestamp
- Actor UID
- Action type
- Document reference (if applicable)
- Context metadata (familyId, share target)

This ensures **full traceability and non-repudiation**.

---

## ⚠️ Known Security Considerations (Beta)

### Base64 Storage
- Base64 encoding is not encryption
- Intended as a controlled storage mechanism, not cryptographic protection
- Future releases may include client-side encryption (AES)

### Firestore Rules
Before production deployment:
- `firestore.rules` MUST validate `request.auth.uid`
- Ensure ownership checks for read/write/delete operations
- Prevent unauthorized family access leakage

Example enforcement logic:
- Allow read if:
  - `resource.data.ownerId == request.auth.uid`
  - OR `request.auth.uid` exists in `sharedWith[]`
  - OR `resource.data.familyId == user.familyId`

---

## 🔍 Reporting a Vulnerability

We take security research seriously and appreciate responsible disclosure.

### 📧 Contact
If you discover a vulnerability, please report it privately:

**Email:** `security@vaultara.app`  
*(or contact the project owner via GitHub)*

### 📝 Include the Following
- Clear description of the issue
- Steps to reproduce
- Potential impact assessment
- Screenshots or logs (if applicable)

⚠️ **Please do NOT open public GitHub issues for security vulnerabilities.**

---

## 🚫 Out-of-Scope Issues

The following are NOT considered security vulnerabilities:
- UI/UX bugs
- Rate limits triggered by excessive requests
- Issues caused by modified client-side code
- Vulnerabilities in unsupported versions

---

## 🧬 Security Roadmap (Planned)

- Client-side AES encryption before upload
- Zero-knowledge document handling
- Per-document encryption keys
- Activity anomaly detection
- PWA offline security hardening

---

## 🤝 Responsible Disclosure Commitment

We commit to:
- Acknowledging valid reports promptly
- Investigating responsibly
- Issuing fixes as quickly as possible
- Crediting researchers (with permission)

---

<div align="center">
  <sub>Security is a feature — not an afterthought.</sub>
</div>
