import { html, render } from '../lib/dom.js';
import { logoMark } from '../lib/icons.js';

export default function setup({ root }) {
  render(
    root,
    html`<div class="center-screen">
      <div class="center-screen__box">
        ${logoMark(64)}
        <p class="eyebrow">One step left</p>
        <h1 class="page__title">Connect Vaultara to <em>Firebase</em></h1>
        <p class="muted">
          This copy does not have a Firebase configuration yet. Copy <span class="mono">.env.example</span> to
          <span class="mono">.env.local</span>, fill in your web app values, then restart the dev server.
        </p>
        <pre class="code-block">cp .env.example .env.local
# edit .env.local, then
npm run dev</pre>
        <p class="muted">To try it with no cloud project at all, run the local emulators and set <span class="mono">VITE_USE_EMULATORS=true</span>.</p>
      </div>
    </div>`
  );
}
