# 🛡️ Privacy Policy — Vaultara (GovDoc)

Vaultara is a **privacy-first digital document vault** designed to protect sensitive citizen information.  
This document explains **what data is collected**, **how it is used**, and **how user privacy is preserved**.

---

## 📌 Privacy Principles

Vaultara is built on the following principles:

- **Data Minimization** — collect only what is strictly required
- **User Ownership** — users retain full control over their documents
- **Transparency** — all access and actions are traceable
- **Security by Design** — privacy is enforced at the architectural level
- **No Commercial Exploitation** — user data is never sold or monetized

---

## 📂 Data We Collect

### 🔑 Account Information
- Email address (used for authentication)
- Firebase UID (internal identifier)
- Email verification status

### 📄 Document Data
- User-uploaded documents encoded as **Base64 strings**
- Document metadata:
  - Name
  - Category (Identity, Education, Health)
  - Owner ID
  - Family ID (if linked)
  - Sharing metadata

### 🧾 Activity Metadata
- Action logs for security events:
  - Login
  - Upload
  - Share
  - Delete
  - Family linking

---

## 🚫 Data We Do NOT Collect

Vaultara does **NOT** collect:
- Government-issued IDs directly
- Biometric data
- Location data
- Device fingerprinting
- Advertising identifiers
- Third-party analytics or trackers

---

## 🔐 How Data Is Used

Data is used exclusively to:
- Authenticate users
- Display owned and shared documents
- Enable family-based access
- Generate audit logs for traceability
- Securely render the user dashboard

No data is used for profiling, marketing, or behavioral analysis.

---

## 🧠 Storage & Retention

- Documents are stored in **Cloud Firestore**
- Content is Base64-encoded (not encrypted in Beta)
- Data is retained until explicitly deleted by the user
- Deleted documents are permanently removed from active storage

Future versions may implement encrypted backups and retention controls.

---

## 👨‍👩‍👧‍👦 Family & Sharing Privacy

- Family linking is **opt-in**
- Only documents tagged with a `familyId` are visible to linked members
- Users cannot access documents without explicit ownership, sharing, or family linkage
- Self-sharing is explicitly blocked to prevent redundancy and abuse

---

## 🔍 User Rights

Users have the right to:
- View all stored personal data
- Delete documents permanently
- Leave a family group at any time
- Revoke shared access
- Close their account and remove associated data

---

## ⚠️ Beta Privacy Notice

Vaultara is currently in **BETA**.

Known limitations:
- Base64 encoding is not cryptographic encryption
- Firestore security rules must be reviewed before production deployment

Users are advised not to store irreplaceable or highly sensitive documents until encryption is implemented.

---

## 📧 Privacy Contact

For privacy-related concerns or data requests:

**Email:** `privacy@vaultara.app`  
(or contact the project maintainer via GitHub)

---

<div align="center">
  <sub>Your documents. Your control. Your privacy.</sub>
</div>
