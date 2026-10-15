import { html, render } from '../lib/dom.js';
import { icon, logoMark } from '../lib/icons.js';
import { getState } from '../lib/store.js';

const PILLARS = [
  ['lock', 'Sealed the moment it arrives', 'Every file gets its own AES-256-GCM key. That key is itself wrapped by a master key kept in Google Secret Manager. Plain files never rest anywhere.'],
  ['shield', 'No public links, ever', 'There is no URL that opens a document. Each open goes through a check of who you are and what you are allowed to see.'],
  ['activity', 'A trail nobody can edit', 'Every view, download and share is written by our servers, not by your browser, so the record cannot be forged or tidied up later.'],
  ['calendar', 'Sharing with an end date', 'Share by email, choose view only or download, choose when access ends, and take it back with one click.'],
  ['key', 'Two-step sign in', 'Use a password with an authenticator app, or skip the password and sign in with a link sent to your inbox.'],
  ['family', 'Made for households', 'Start a family, invite people with a one-time code, and choose exactly which papers the household can see.']
];

const FAQ = [
  ['Is Vaultara run by the government?', 'No. Vaultara is an independent project. It is not affiliated with, endorsed by or connected to any government body, and it does not replace official services.'],
  ['What can I store?', 'PDF, JPEG, PNG, WebP and HEIC files up to 15MB each. The file type is checked from the file itself, not from its name.'],
  ['Can Vaultara read my documents?', 'Files are encrypted at rest and only decrypted for you, or for someone you have shared with, inside our secured server environment. Vaultara is not end-to-end encrypted, because sharing and family access need the server to open files on your behalf. Every open is logged.'],
  ['What if I forget my password?', 'Use the reset link on the sign in page. Your documents stay exactly where they are. If you turned on two-step sign in, keep your authenticator app safe.'],
  ['Can I leave and take my data?', 'Yes. Settings lets you export your records and delete your account, which removes your files, keys, shares and activity.']
];

export default function landing({ root }) {
  const { user } = getState();
  const signedIn = Boolean(user?.emailVerified);
  render(
    root,
    html`<header class="site-header">
        <a class="brand" href="/">${logoMark(36)}<span>Vaultara</span></a>
        <nav class="site-nav" aria-label="Site">
          <a href="#how">How it works</a>
          <a href="#security">Security</a>
          <a href="#faq">Questions</a>
          ${signedIn
            ? html`<a class="btn btn--primary btn--sm" href="/app">Open your vault</a>`
            : html`<a href="/login">Sign in</a><a class="btn btn--primary btn--sm" href="/register">Create account</a>`}
        </nav>
      </header>

      <main>
        <section class="hero">
          <div>
            <p class="eyebrow">A private vault for the papers that matter</p>
            <h1 class="hero__title">Your papers, <em>kept safe</em>, kept together.</h1>
            <p class="hero__lede">
              Vaultara holds your identity cards, certificates and health records under lock, shares them only with the
              people you choose, and writes down every time anyone opens one.
            </p>
            <div class="hero__cta">
              <a class="btn btn--primary" href="${signedIn ? '/app' : '/register'}">
                ${signedIn ? 'Open your vault' : 'Create your vault'}${icon('arrow', { size: 18 })}
              </a>
              <a class="btn" href="#how">See how it works</a>
            </div>
            <p class="hero__fine">
              <span>${icon('lock', { size: 16 })} Encrypted at rest</span>
              <span>${icon('key', { size: 16 })} Two-step sign in</span>
              <span>${icon('activity', { size: 16 })} Full activity trail</span>
            </p>
          </div>

          <div class="paper-stack" aria-hidden="true">
            <div class="paper paper--back"></div>
            <div class="paper paper--mid"></div>
            <div class="paper paper--front">
              <span class="doc-tab">${icon('id', { size: 14 })} Identity</span>
              <span class="stamp stamp--ok paper__stamp">Sealed</span>
              <p class="eyebrow">VLT-7K2Q9X</p>
              <p class="paper__title">Passport,<br />Laksh P.</p>
              <div class="paper__line paper__line--mid"></div>
              <div class="paper__line"></div>
              <div class="paper__line paper__line--short"></div>
              <p class="paper__key">${icon('lock', { size: 14 })} AES-256-GCM / key 3f9a...c21</p>
              <span class="paper__seal">${logoMark(64)}</span>
            </div>
          </div>
        </section>

        <section class="section" id="how">
          <div class="section__head">
            <p class="eyebrow">How it works</p>
            <h2>Three steps, and you are done.</h2>
          </div>
          <div class="steps">
            <div class="step"><h3>Add</h3><p>Upload a scan or a photo. We check what it really is, seal it, and file it under a category you choose.</p></div>
            <div class="step"><h3>Organise</h3><p>Add tags and an expiry date. Vaultara tells you when a passport or licence is about to lapse.</p></div>
            <div class="step"><h3>Share</h3><p>Give a person access for as long as you like, or open a document to your whole household.</p></div>
          </div>
        </section>

        <section class="section" id="security">
          <div class="section__head">
            <p class="eyebrow">Security, plainly</p>
            <h2>Built so you do not have to take our word for it.</h2>
            <p>These are things the code does today, and the rules that enforce them are public in the repository.</p>
          </div>
          <div class="pillars">
            ${PILLARS.map(
              ([name, title, text]) => html`<div class="pillar">${icon(name, { size: 26 })}<h3>${title}</h3><p>${text}</p></div>`
            )}
          </div>
          <div class="notice notice--info honest">
            ${icon('info')}
            <div class="notice__body">
              <strong>What we do not claim</strong>
              Vaultara is not end-to-end encrypted. Our servers hold the keys so that sharing and family access can work.
              Read the <a href="/security">security notes</a> for the full picture.
            </div>
          </div>
        </section>

        <section class="section" id="faq">
          <div class="section__head">
            <p class="eyebrow">Questions</p>
            <h2>Things people ask first.</h2>
          </div>
          <div class="faq">
            ${FAQ.map(([q, a]) => html`<details><summary>${q}</summary><p>${a}</p></details>`)}
          </div>
        </section>

        <div class="cta-band">
          <div class="cta-band__inner">
            <h2>Put your papers somewhere safer than a drawer.</h2>
            <a class="btn" href="${signedIn ? '/app' : '/register'}">${signedIn ? 'Open your vault' : 'Create your vault'}</a>
          </div>
        </div>
      </main>

      <footer class="site-footer">
        <p>Vaultara is an independent project and is not affiliated with any government body.</p>
        <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/security">Security</a>
          <a href="https://github.com/TheRealLaksh/Vaultara-GovDoc" data-external>Source</a></nav>
      </footer>`
  );
}
