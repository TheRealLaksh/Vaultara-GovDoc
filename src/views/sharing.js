import { html, render, delegate } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { formatDate } from '../lib/format.js';
import { loadShares, revokeShare } from '../services/sharing.js';
import { loadVault } from '../services/vault.js';
import { openShareDialog } from '../components/share-dialog.js';
import { confirmDialog } from '../components/modal.js';
import { toast } from '../components/toast.js';

const permission = (p) => (p === 'download' ? 'View and download' : 'View only');
const ends = (s) => (s.expiresAt ? formatDate(s.expiresAt) : 'When you stop');

export default async function sharingView({ root }) {
  let data = { created: [], received: [] };
  let owned = [];

  const paint = () =>
    render(
      root,
      html`<div class="page">
        <header class="page__head">
          <div>
            <p class="eyebrow">Who can see what</p>
            <h1 class="page__title"><em>Sharing</em> centre</h1>
            <p class="page__lede">Every document you have opened to someone, and everything others have opened to you.</p>
          </div>
          <div class="page__actions">
            <button class="btn btn--primary" type="button" data-action="new" ${owned.length ? '' : 'disabled'}>${icon('share', { size: 18 })} Share a document</button>
          </div>
        </header>

        <section class="stack">
          <h2>Shared by you</h2>
          ${data.created.length
            ? html`<div class="table-wrap"><table class="table">
                <thead><tr><th>Document</th><th>Shared with</th><th>Access</th><th>Ends</th><th></th></tr></thead>
                <tbody>${data.created.map(
                  (s) => html`<tr><td><a href="/app/documents/${s.docId}"><strong>${s.docTitle}</strong></a></td><td>${s.recipientEmail}</td>
                    <td><span class="badge">${permission(s.permission)}</span></td><td>${ends(s)}</td>
                    <td class="actions"><button class="btn btn--sm btn--danger" type="button" data-action="revoke" data-share="${s.id}" data-who="${s.recipientEmail}">Stop sharing</button></td></tr>`
                )}</tbody></table></div>`
            : html`<div class="empty"><div class="empty__art">${icon('share', { size: 28 })}</div><h3>You have not shared anything</h3>
                <p>${owned.length ? 'Choose a document and an email address. You decide what they can do and for how long.' : 'Add a document first, then you can share it.'}</p></div>`}
        </section>

        <section class="stack">
          <h2>Shared with you</h2>
          ${data.received.length
            ? html`<div class="table-wrap"><table class="table">
                <thead><tr><th>Document</th><th>From</th><th>Access</th><th>Ends</th><th></th></tr></thead>
                <tbody>${data.received.map(
                  (s) => html`<tr><td><a href="/app/documents/${s.docId}"><strong>${s.docTitle}</strong></a></td><td>${s.ownerEmail}</td>
                    <td><span class="badge">${permission(s.permission)}</span></td><td>${ends(s)}</td>
                    <td class="actions"><a class="btn btn--sm" href="/app/documents/${s.docId}">Open</a></td></tr>`
                )}</tbody></table></div>`
            : html`<div class="empty"><div class="empty__art">${icon('folder', { size: 28 })}</div><h3>Nothing shared with you yet</h3><p>When someone shares a document with this email address it appears here and in your vault.</p></div>`}
        </section>
      </div>`
    );

  const load = async () => {
    [data, owned] = await Promise.all([loadShares(), loadVault().then((all) => all.filter((d) => d.access === 'owner'))]);
    paint();
  };

  render(root, html`<div class="page"><div class="skeleton"></div></div>`);
  try {
    await load();
  } catch (error) {
    render(root, html`<div class="page"><div class="empty"><h3>We could not load sharing</h3><p>${error.message}</p></div></div>`);
    return;
  }

  return delegate(root, 'click', {
    new: async () => {
      if (await openShareDialog({ docs: owned })) {
        toast.ok('Shared.');
        await load();
      }
    },
    revoke: async (el) => {
      const ok = await confirmDialog({
        title: 'Stop sharing?',
        message: `${el.dataset.who} will lose access straight away.`,
        confirmLabel: 'Stop sharing',
        danger: true,
        onConfirm: () => revokeShare(el.dataset.share)
      });
      if (ok) {
        toast.ok('Access removed.');
        await load();
      }
    }
  });
}
