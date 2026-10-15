import { html, render } from '../lib/dom.js';
import { logoMark } from '../lib/icons.js';

const DOCS = {
  privacy: {
    title: 'Privacy notes',
    updated: 'October 2026',
    sections: [
      ['What we keep', 'Your email address, the name you give us, the documents you upload and their details (title, category, tags, expiry date, size), who you have shared them with, your family membership, and an activity trail of what happened to your account and documents.'],
      ['What we do with it', 'We store it so that you can open your documents and share them. We do not sell data, show advertising, or use your documents to train anything.'],
      ['Who can see a document', 'You. People you shared it with, until the end date you chose. Members of your family, only for documents you marked as visible to the family. Authorised operators of the service can technically decrypt files because the server holds the keys, so their access is restricted and logged.'],
      ['Activity trail', 'When a document is opened, downloaded, shared or removed, the server records who did it, when, and a shortened network address and browser name. You can see this on the Activity page. The document owner can see what other people did to their documents.'],
      ['Your controls', 'Edit or delete any document. Revoke any share. Leave a family. Export your records. Delete your account, which removes your files, keys, shares and activity entries you created.'],
      ['Where data lives', 'Google Firebase services in the Mumbai region (asia-south1) for functions, with Firestore and Cloud Storage in the location chosen for the project.'],
      ['Contact', 'Open an issue on the project repository for privacy questions.']
    ]
  },
  security: {
    title: 'Security notes',
    updated: 'October 2026',
    sections: [
      ['How files are protected', 'Each file is checked by its first bytes, then encrypted with AES-256-GCM using a fresh random key. That key is wrapped with a master key held in Google Secret Manager and stored apart from the file. The encrypted file lives in a storage area no browser can read.'],
      ['How access is decided', 'Firestore and Storage rules deny everything by default. Reading metadata requires a verified email address and a legitimate relationship to the document. Opening a file always goes through a server endpoint that checks the same relationship again.'],
      ['Sign in', 'Email and password with enforced email verification, passwordless email links, and optional authenticator app codes. Sensitive actions ask for your password again.'],
      ['Audit trail', 'Entries are written only by server code. No browser can create, change or delete them.'],
      ['What this is not', 'Vaultara is not end-to-end encrypted. The server must be able to open files so that sharing and family access work. If you need zero-knowledge storage, do not use this service for those documents.'],
      ['Reporting a problem', 'Please report vulnerabilities privately through the repository security advisory page, and give us a reasonable time to fix them before publishing.']
    ]
  }
};

export default function legal({ root, route }) {
  const doc = DOCS[route.doc];
  render(
    root,
    html`<header class="site-header">
        <a class="brand" href="/">${logoMark(36)}<span>Vaultara</span></a>
        <nav class="site-nav" aria-label="Site"><a class="btn btn--sm" href="/">Back home</a></nav>
      </header>
      <main class="legal">
        <p class="eyebrow">Updated ${doc.updated}</p>
        <h1>${doc.title}</h1>
        ${doc.sections.map(([heading, text]) => html`<h2>${heading}</h2><p>${text}</p>`)}
      </main>
      <footer class="site-footer">
        <p>Vaultara is an independent project and is not affiliated with any government body.</p>
        <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/security">Security</a></nav>
      </footer>`
  );
}
