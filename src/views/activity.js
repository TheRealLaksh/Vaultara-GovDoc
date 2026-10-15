import { html, render, delegate, $ } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { getState } from '../lib/store.js';
import { ACTIONS, loadActivity } from '../services/activity.js';
import { timeline } from '../components/event.js';

const GROUPS = ['All', 'Documents', 'Sharing', 'Family', 'Account'];

export default async function activityView({ root }) {
  let entries = [];
  let cursor = null;
  let more = false;
  let group = 'All';
  let loading = false;

  const me = () => getState().user.uid;

  const paintList = () => {
    const shown = entries.filter((e) => group === 'All' || ACTIONS[e.action]?.group === group);
    render(
      $('#list', root),
      shown.length
        ? html`<div class="timeline">${timeline(shown, me())}</div>
            ${more ? html`<div class="row"><button class="btn" type="button" data-action="more" ${loading ? 'disabled' : ''}>${loading ? 'Loading...' : 'Load older activity'}</button></div>` : ''}`
        : html`<div class="empty"><div class="empty__art">${icon('activity', { size: 28 })}</div><h3>No activity here yet</h3><p>${more ? 'Nothing recent in this group. Load older activity to look further back.' : 'Actions on your account and documents will be listed here.'}</p>
            ${more ? html`<button class="btn" type="button" data-action="more">Load older activity</button>` : ''}</div>`
    );
  };

  const paint = () => {
    render(
      root,
      html`<div class="page page--narrow">
        <header class="page__head"><div>
          <p class="eyebrow">An honest record</p>
          <h1 class="page__title">Activity <em>trail</em></h1>
          <p class="page__lede">Every sign in, view, download, share and removal. These entries are written by the server, so nobody can edit them, including you.</p>
        </div></header>
        <div class="toolbar" role="group" aria-label="Filter activity">
          ${GROUPS.map((g) => html`<button class="chip" type="button" data-action="group" data-group="${g}" aria-pressed="${g === group}">${g}</button>`)}
        </div>
        <div id="list" aria-live="polite"></div>
      </div>`
    );
    paintList();
  };

  const fetchPage = async (reset = false) => {
    loading = true;
    try {
      const page = await loadActivity({ after: reset ? null : cursor });
      entries = reset ? page.items : [...entries, ...page.items];
      cursor = page.cursor;
      more = page.more;
    } finally {
      loading = false;
    }
  };

  render(root, html`<div class="page page--narrow"><div class="skeleton"></div></div>`);
  try {
    await fetchPage(true);
  } catch (error) {
    console.error(error);
    render(root, html`<div class="page"><div class="empty"><div class="empty__art">${icon('alert', { size: 28 })}</div><h3>We could not load activity</h3><p>${error.message}</p></div></div>`);
    return;
  }
  paint();

  return delegate(root, 'click', {
    group: (el) => {
      group = el.dataset.group;
      root.querySelectorAll('[data-action="group"]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      paintList();
    },
    more: async () => {
      paintList();
      try {
        await fetchPage(false);
      } catch (error) {
        console.error(error);
      }
      paintList();
    }
  });
}
