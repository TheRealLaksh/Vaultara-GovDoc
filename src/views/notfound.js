import { html, render } from '../lib/dom.js';
import { logoMark } from '../lib/icons.js';

export default function notFound({ root }) {
  render(
    root,
    html`<div class="center-screen">
      <div class="center-screen__box">
        ${logoMark(64)}
        <p class="eyebrow">Error 404</p>
        <h1 class="page__title">This page is <em>not filed</em> here.</h1>
        <p class="muted">The address may be mistyped, or the page may have moved.</p>
        <a class="btn btn--primary" href="/">Back to the front page</a>
      </div>
    </div>`
  );
}
