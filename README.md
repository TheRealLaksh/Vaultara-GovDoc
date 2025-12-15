# 🔐 Vaultara (GovDoc)

> **Secure Citizen Document Vault & Family Sharing System**

<div align="center">

![Status](https://img.shields.io/badge/STATUS-BETA-orange?style=for-the-badge)
![Security](https://img.shields.io/badge/SECURITY-ENCRYPTED-green?style=for-the-badge)
![Tech](https://img.shields.io/badge/STACK-FIREBASE_JS-blue?style=for-the-badge)

</div>

## 📖 Introduction
**Vaultara** is a secure, cloud-based repository designed for citizens to store, manage, and share essential government documents (Identity, Health, Education). Built with a "Privacy-First" approach, it features robust audit logging, family account linking, and a responsive "Gov-Tech" UI design system.

Unlike traditional storage, Vaultara emphasizes **traceability**—every action (view, share, delete) is immutably logged for user security.

---

## 🚀 Key Features

### 🛡️ Secure Document Management
* **Client-Side Processing:** Files are converted to Base64 strings before upload, ensuring no raw files sit in traditional storage buckets.
* **Size Enforcement:** Strict 500KB limit enforced on the client side to maintain database performance.
* **Categorization:** Tag documents as *Identity*, *Education*, or *Health* with dedicated visual icons.

### 👨‍👩‍👧‍👦 Family Linking & Sharing
* **Family ID System:** Users can generate or join a "Family ID" (e.g., `FAM-1234`) to automatically view documents shared across the entire household.
* **Direct Sharing:** Granular sharing permissions allowing users to grant access to specific individuals via email.
* **Smart Dashboard:** Unified view aggregating **Owned**, **Shared**, and **Family** documents into a single secure grid.

### 🔍 Smart Search & Organization
* **Instant Filtering:** Real-time client-side search allows users to find documents by name instantly without page reloads.
* **Category Filters:** Dedicated one-click filters for *Identity*, *Education*, and *Health* documents to de-clutter the vault.
* **Visual Indicators:** Unique SVG icons and color-coded badges (e.g., "SECURE", "SHARED IN", "FAMILY") for quick document recognition.

### ✨ Interactive "Gov-Tech" UX
* **Cinematic Motion:** The custom CSS engine powers 30+ micro-interactions, including `slide-up-content`, `pulse`, and `reveal` animations for button clicks and page loads.
* **Feedback Loops:** Instant visual feedback (spinners, success toasts) for all async actions like Uploading and Sharing.

### ✅ Identity Verification
* **Trust Badges:** Visual "Verified Citizen" badges appear on profiles once email verification is complete.
* **Action Banners:** Conditional alerts prompt unverified users to secure their account via email links.

---

## 🛡️ Security Architecture

### 📝 Granular Audit Logging
* **Event Tracking:** Automatically records high-value actions (`LOGIN`, `UPLOAD`, `SHARE`, `DELETE`) with server-side timestamps for immutable proof of activity.
* **Waterfall Visualization:** The Activity Log uses staggered animations to present history in a clear, time-ordered waterfall list.
* **Context Aware:** Logs specifically capture metadata like "Family ID" updates or specific document names for detailed traceability.

### 🔐 Multi-Tier Access Control
* **Owner Sovereignty:** Only the original uploader (`ownerId`) retains "Delete" privileges, ensuring shared users cannot destroy data.
* **Family Inheritance:** Documents tagged with a `familyId` are automatically propagated to all linked accounts without manual sharing.
* **Self-Share Prevention:** Logic guards explicitly block users from sharing documents with their own email to prevent database redundancy.

---

## 🎨 Design System & Backend Logic

### 🎨 "Gov-Tech" Aesthetics
* **Cinematic Micro-Interactions:** "Reveal" buttons expand a colored circle and swap text (e.g., "Upload" → "Upload Securely") on hover.
* **Adaptive Navigation:** The interface automatically shifts from a desktop **Sidebar** to a mobile **Bottom Bar** based on viewport width.
* **Staggered Loading:** Dashboard items and table rows enter the viewport with calculated delays (`anim-stagger-1`, `anim-stagger-2`) for a polished feel.

### 💾 Smart Data Aggregation
* **Unified Querying:** The dashboard executes three parallel queries (Owned, Shared, Family), merges the results, and deduplicates entries client-side for a seamless view.
* **Identity Management:** Built-in generator creates human-readable 4-digit codes (`FAM-XXXX`) for easy family onboarding.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JS (ES6+) | Lightweight, no-framework approach for maximum speed. |
| **Styling** | CSS3 Variables | Custom "Gov-Tech" design system (`--gov-navy`, `--gov-slate`). |
| **Backend** | Firebase (BaaS) | Serverless architecture. |
| **Database** | Cloud Firestore | NoSQL document storage for metadata and Base64 file content. |
| **Auth** | Firebase Auth | Secure email/password handling. |
| **Hosting** | Firebase Hosting | Fast, secure static content delivery. |

---

## 📂 Project Structure

```bash
Vaultara-GovDoc/
├── firestore.rules          # Database security rules
├── test-cases.md            # System test scenarios
├── public/                  # Static assets & frontend code
│   ├── index.html           # Landing page
│   ├── dashboard.html       # Main application view
│   ├── css/
│   │   └── style.css        # Core design system & animations
│   └── js/
│       ├── auth.js          # Session management
│       ├── dashboard.js     # Document fetching & rendering
│       ├── upload.js        # File processing & encryption
│       ├── logger.js        # Audit logging utility
│       └── utils.js         # Shared helper functions
└── firebase.json            # Firebase configuration
## 💻 Technical Highlights

### ⚡ Performance Architecture
* **Zero-Bundle Frontend:** Built entirely with **Vanilla JavaScript (ES6+)**, eliminating the need for heavy bundlers like Webpack or huge `node_modules` folders.
* **Optimized Assets:** No external CSS frameworks (Tailwind/Bootstrap) used; the design system is hand-coded using native CSS Variables for maximum performance.

### 🧪 Robust Testing
* **Security Validation:** Includes test cases for SQL/NoSQL injection prevention and input sanitization.
* **Logic Guards:** Client-side validation prevents critical errors, such as uploading oversized files (>500KB).

---

## ⚡ Getting Started

### Prerequisites
* Node.js & npm installed
* Firebase CLI installed (`npm install -g firebase-tools`)

### Installation

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/yourusername/vaultara-govdoc.git](https://github.com/yourusername/vaultara-govdoc.git)
   cd vaultara-govdoc

   ## 🔥 Initialize Firebase

```bash
firebase login
firebase init
# Select: Firestore, Hosting
# Use existing project: gov-docs-b2a1f
```

---

## ▶️ Run Locally

```bash
firebase serve
```

Access the app at:  
`http://localhost:5000`

---

## ⚠️ Security Note (Beta)

**Current Storage:**  
Documents are stored directly in **Firestore as Base64 strings**.

**Vulnerability Notice:**  
Before deploying to production, ensure `firestore.rules` strictly validate  
`request.auth.uid` against the resource owner to prevent unauthorized access.

---

<div align="center">
  <sub>Built with 🔐 by the Vaultara Team</sub>
</div>
