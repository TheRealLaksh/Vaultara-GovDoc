import { html, render, delegate, debounce, $ } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { getState, remember } from '../lib/store.js';
import { daysUntil, plural, toDate } from '../lib/format.js';
import { loadVault, CATEGORIES } from '../services/vault.js';
import { docCard, docRow } from '../components/doc-card.js';
import { navigate } from '../lib/router.js';

const TABS = [
  ['all', 'All'],
  ['owner', 'Mine'],
  ['shared', 'Shared with me'],
  ['family', 'Family']
];

export default async function vaultView({ root }) {
  const state = { docs: [], tab: 'all', category: 'all', q: '', sort: 'new', mode: remember.get('viewMode', 'grid') };
  let failed = false;

  const firstName = () => (getState().profile?.displayName || getState().user?.displayName || '').split(' ')[0];

  const visible = () => {
    const q = state.q.trim().toLowerCase();
    const list = state.docs.filter(
      (d) =>
        (state.tab === 'all' || d.access === state.tab) &&
        (state.category === 'all' || d.category === state.category) &&
        (!q || d.title.toLowerCase().includes(q) || d.tags?.some((t) => t.includes(q)) || d.category.toLowerCase().includes(q))
    );
    const time = (d) => toDate(d.createdAt)?.getTime() || 0;
    if (state.sort === 'name') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (state.sort === 'expiry') list.sort((a, b) => (toDate(a.expiresAt)?.getTime() ?? Infinity) - (toDate(b.expiresAt)?.getTime() ?? Infinity));
    else list.sort((a, b) => time(b) - time(a));
    return list;
  };

  const attention = () =>
    state.docs
      .filter((d) => d.access === 'owner' && d.expiresAt && daysUntil(d.expiresAt) <= 60)
      .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt));

  const counts = () => ({
    all: state.docs.length,
    owner: state.docs.filter((d) => d.access === 'owner').length,
    shared: state.docs.filter((d) => d.access === 'shared').length,
    family: state.docs.filter((d) => d.access === 'family').length
  });

  const paintResults = () => {
    const list = visible();
    const target = $('#results', root);
    if (!target) return;
    if (!list.length) {
      render(
        target,
        state.docs.length
          ? html`<div class="empty"><div class="empty__art">${icon('search', { size: 28 })}</div><h3>Nothing matches that</h3><p>Try a different word, or clear the filters.</p>
              <button class="btn btn--sm" data-action="clear" type="button">Clear filters</button></div>`
          : html`<div class="empty"><div class="empty__art">${icon('vault', { size: 28 })}</div><h3>Your vault is empty</h3>
              <p>Add your first document. It is sealed with its own key the moment it arrives.</p>
              <a class="btn btn--primary" href="/app/upload">${icon('plus', { size: 18 })} Add a document</a></div>`
      );
      return;
    }
    render(target, state.mode === 'grid' ? html`<div class="doc-grid">${list.map(docCard)}</div>` : html`<div class="doc-list">${list.map(docRow)}</div>`);
    [...target.querySelectorAll('.rise')].forEach((el, i) => el.style.setProperty('--i', Math.min(i, 12)));
  };

  const paint = () => {
    const c = counts();
    const soon = attention();
    const name = firstName();
    render(
      root,
      html`<div class="page">
        <header class="page__head">
          <div>
            <p class="eyebrow">${name ? `Good to see you, ${name}` : 'Your vault'}</p>
            <h1 class="page__title">Your <em>vault</em></h1>
            <p class="page__lede">${plural(c.all, 'document')} on file. Everything is sealed and only you decide who sees it.</p>
          </div>
          <div class="page__actions">
            <a class="btn btn--primary" href="/app/upload">${icon('plus', { size: 18 })} Add document</a>
          </div>
        </header>

        ${soon.length
          ? html`<section class="attention" aria-label="Needs attention">
              ${soon.slice(0, 3).map((d) => {
                const days = daysUntil(d.expiresAt);
                return html`<a class="attention__item ${days <= 14 ? 'attention__item--danger' : ''}" href="/app/documents/${d.id}">
                  ${icon('alert')}
                  <span class="grow"><strong>${d.title}</strong>
                    ${days < 0 ? `expired ${Math.abs(days)} days ago` : days === 0 ? 'expires today' : `expires in ${plural(days, 'day')}`}</span>
                  <span class="muted">Renew ${icon('arrow', { size: 16 })}</span>
                </a>`;
              })}
            </section>`
          : ''}

        <section class="stats" aria-label="Summary">
          <div class="stat"><div class="stat__num">${c.all}</div><div class="stat__label">Documents you can see</div></div>
          <div class="stat"><div class="stat__num">${c.owner}</div><div class="stat__label">Added by you</div></div>
          <div class="stat"><div class="stat__num">${state.docs.filter((d) => d.access === 'owner' && d.sharedWithUids?.length).length}</div><div class="stat__label">Shared by you</div></div>
          <div class="stat"><div class="stat__num">${soon.length}</div><div class="stat__label">Need renewal soon</div></div>
        </section>

        <section class="stack">
          <div class="toolbar">
            <div class="search">
              ${icon('search', { size: 18 })}
              <input class="input" id="q" type="search" placeholder="Search titles, tags, categories" aria-label="Search documents" value="${state.q}" />
              <span class="kbd" aria-hidden="true">/</span>
            </div>
            <div class="tabs" role="tablist" aria-label="Whose documents">
              ${TABS.map(([key, label]) => html`<button class="tab" role="tab" type="button" data-action="tab" data-tab="${key}" aria-selected="${state.tab === key}">${label}<span class="count">${c[key]}</span></button>`)}
            </div>
          </div>
          <div class="toolbar">
            ${['all', ...CATEGORIES].map((cat) => html`<button class="chip" type="button" data-action="category" data-category="${cat}" aria-pressed="${state.category === cat}">${cat === 'all' ? 'Every category' : cat}</button>`)}
            <div class="row toolbar__end">
            <label class="sr-only" for="sort">Sort by</label>
            <select class="select sort-select" id="sort" aria-label="Sort by">
              <option value="new" ${state.sort === 'new' ? 'selected' : ''}>Newest first</option>
              <option value="name" ${state.sort === 'name' ? 'selected' : ''}>Name</option>
              <option value="expiry" ${state.sort === 'expiry' ? 'selected' : ''}>Expiring soonest</option>
            </select>
            <div class="tabs" role="group" aria-label="Layout">
              <button class="tab" type="button" data-action="mode" data-mode="grid" aria-selected="${state.mode === 'grid'}" aria-label="Card view">${icon('grid', { size: 18 })}</button>
              <button class="tab" type="button" data-action="mode" data-mode="list" aria-selected="${state.mode === 'list'}" aria-label="List view">${icon('list', { size: 18 })}</button>
            </div>
            </div>
          </div>
          <div id="results" aria-live="polite"></div>
        </section>
      </div>`
    );
    paintResults();
  };

  const paintLoading = () =>
    render(root, html`<div class="page"><header class="page__head"><div><p class="eyebrow">Opening</p><h1 class="page__title">Your <em>vault</em></h1></div></header>
      <div class="doc-grid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div></div>`);

  const paintError = () =>
    render(root, html`<div class="page"><div class="empty"><div class="empty__art">${icon('alert', { size: 28 })}</div><h3>We could not open your vault</h3>
      <p>Check your connection and try again.</p><button class="btn btn--primary" type="button" data-action="retry">Try again</button></div></div>`);

  const load = async () => {
    paintLoading();
    try {
      state.docs = await loadVault();
      failed = false;
      paint();
    } catch (error) {
      console.error(error);
      failed = true;
      paintError();
    }
  };

  const offClick = delegate(root, 'click', {
    tab: (el) => {
      state.tab = el.dataset.tab;
      paint();
    },
    category: (el) => {
      state.category = el.dataset.category;
      paint();
    },
    mode: (el) => {
      state.mode = el.dataset.mode;
      remember.set('viewMode', state.mode);
      paint();
    },
    clear: () => {
      Object.assign(state, { tab: 'all', category: 'all', q: '' });
      paint();
    },
    retry: load
  });

  const onInput = debounce((event) => {
    if (event.target.id === 'q') {
      state.q = event.target.value;
      paintResults();
    }
  }, 120);
  const onChange = (event) => {
    if (event.target.id === 'sort') {
      state.sort = event.target.value;
      paintResults();
    }
  };
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);

  const onKey = (event) => {
    const typing = /input|textarea|select/i.test(event.target.tagName) || event.target.isContentEditable;
    if (typing || event.metaKey || event.ctrlKey || event.altKey || failed) return;
    if (event.key === '/') {
      event.preventDefault();
      $('#q', root)?.focus();
    } else if (event.key === 'n') {
      navigate('/app/upload');
    }
  };
  document.addEventListener('keydown', onKey);

  await load();

  return () => {
    offClick();
    root.removeEventListener('input', onInput);
    root.removeEventListener('change', onChange);
    document.removeEventListener('keydown', onKey);
  };
}
