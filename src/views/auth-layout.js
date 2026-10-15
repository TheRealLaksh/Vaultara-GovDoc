import { html } from '../lib/dom.js';
import { icon, logoMark } from '../lib/icons.js';

// Two-column layout shared by sign in, register, reset and verify.
export function authLayout(content) {
  return html`<div class="auth">
    <main class="auth__main">
      <div class="auth__card">${content}</div>
    </main>
    <aside class="auth__panel" aria-hidden="true">
      <a class="brand" href="/">${logoMark(38)}<span>Vaultara</span></a>
      <p class="auth__quote">The papers you cannot afford to <em>lose</em>, under one lock.</p>
      <ul class="auth__list">
        <li>${icon('lock')}<span>Every file sealed with its own key</span></li>
        <li>${icon('share')}<span>Share by email, with an end date</span></li>
        <li>${icon('activity')}<span>A record of every time a document is opened</span></li>
      </ul>
    </aside>
  </div>`;
}
