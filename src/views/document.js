import { html, render, delegate, $ } from '../lib/dom.js';
import { categoryIcon, icon } from '../lib/icons.js';
import { getState } from '../lib/store.js';
import { expiryStatus, formatBytes, formatDate, formatDateTime, refNumber } from '../lib/format.js';
import { CATEGORIES, deleteDocument, downloadName, fetchFile, getDocument, saveBlob, updateDocument } from '../services/vault.js';
import { revokeShare, sharesForDocument } from '../services/sharing.js';
import { loadActivity } from '../services/activity.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { openShareDialog } from '../components/share-dialog.js';
import { mountTagInput } from '../components/tags.js';
import { eventRow } from '../components/event.js';
import { stampFor, typeLabel } from '../components/doc-card.js';
import { toast } from '../components/toast.js';
import { navigate } from '../lib/router.js';

export default async function documentView({ root, params }) {
  let doc = null;
  let shares = [];
  let events = [];
  let previewUrl = null;
  let previewType = null;
  let previewState = 'idle'; // idle | loading | ready | error | unsupported
  let previewMessage = '';

  const me = () => getState().user.uid;
  const isOwner = () => doc.access === 'owner';
  const canDownload = () => isOwner() || doc.access === 'family' || doc.share?.permission === 'download';

  const releasePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  };

  const previewPanel = () => {
    if (previewState === 'ready') {
      return previewType.startsWith('image/')
        ? html`<img src="${previewUrl}" alt="Preview of ${doc.title}" />`
        : html`<iframe src="${previewUrl}" title="Preview of ${doc.title}"></iframe>`;
    }
    const busy = previewState === 'loading';
    return html`<div class="preview__cta">
      <span class="empty__art">${icon(busy ? 'clock' : 'eye', { size: 26 })}</span>
      <p>${previewState === 'unsupported'
        ? 'This file type cannot be previewed in the browser. Download it to open it.'
        : previewState === 'error'
          ? previewMessage
          : 'The document is decrypted only when you ask to see it. Opening it is recorded in the activity trail.'}</p>
      ${previewState === 'unsupported'
        ? ''
        : html`<button class="btn btn--primary" type="button" data-action="preview" ${busy ? 'disabled' : ''}>
            ${busy ? 'Decrypting...' : previewState === 'error' ? 'Try again' : 'Open preview'}</button>`}
    </div>`;
  };

  const paint = () => {
    const expiry = expiryStatus(doc.expiresAt);
    render(
      root,
      html`<div class="page">
        <header class="page__head">
          <div>
            <a class="back-link" href="/app">${icon('back', { size: 16 })} Back to vault</a>
            <p class="eyebrow">${doc.category} · <span class="mono">${refNumber(doc.id)}</span></p>
            <h1 class="page__title">${doc.title}</h1>
            <div class="row doc-stamps">${stampFor(doc)}${expiry ? html`<span class="badge badge--${expiry.tone === 'ok' ? 'ok' : expiry.tone}">${icon('clock', { size: 13 })}${expiry.label}</span>` : ''}</div>
          </div>
          <div class="page__actions">
            ${canDownload() ? html`<button class="btn" type="button" data-action="download">${icon('download', { size: 18 })} Download</button>` : ''}
            ${isOwner()
              ? html`<button class="btn" type="button" data-action="share">${icon('share', { size: 18 })} Share</button>
                  <button class="btn" type="button" data-action="edit">${icon('edit', { size: 18 })} Edit</button>
                  <button class="btn btn--danger" type="button" data-action="delete">${icon('trash', { size: 18 })} Delete</button>`
              : ''}
          </div>
        </header>

        <div class="doc-layout">
          <section class="preview" id="preview" aria-label="Document preview">${previewPanel()}</section>

          <div class="stack">
            <section class="panel">
              <h2 class="panel__title">Details</h2>
              <dl class="dl detail-list">
                <dt>Category</dt><dd>${icon(categoryIcon(doc.category), { size: 16 })} ${doc.category}</dd>
                <dt>File</dt><dd>${typeLabel(doc)}, ${formatBytes(doc.size)}</dd>
                <dt>Added</dt><dd>${formatDateTime(doc.createdAt)}</dd>
                <dt>Expires</dt><dd>${formatDate(doc.expiresAt, 'No expiry set')}</dd>
                ${doc.tags?.length ? html`<dt>Tags</dt><dd class="row">${doc.tags.map((t) => html`<span class="chip chip--tag">${t}</span>`)}</dd>` : ''}
                <dt>Fingerprint</dt><dd class="mono">${(doc.sha256 || '').slice(0, 16)}...</dd>
              </dl>
              ${doc.access === 'shared' && doc.share
                ? html`<hr class="divider" />
                    <p class="muted">Shared with you by <strong>${doc.share.ownerEmail}</strong>. ${doc.share.permission === 'download' ? 'You can view and download it.' : 'You can view it.'}
                      ${doc.share.expiresAt ? `Access ends ${formatDate(doc.share.expiresAt)}.` : ''}</p>
                    <button class="btn btn--sm btn--danger" type="button" data-action="leave">Remove from my list</button>`
                : ''}
            </section>

            ${isOwner()
              ? html`<section class="panel">
                  <div class="panel__head"><div><h2 class="panel__title">Who has access</h2></div>
                    <button class="btn btn--sm" type="button" data-action="share">${icon('plus', { size: 16 })} Share</button></div>
                  <div class="share-line"><div class="share-line__who"><strong>You</strong><div class="muted">Owner</div></div><span class="badge badge--ok">Full access</span></div>
                  ${doc.familyShared ? html`<div class="share-line"><div class="share-line__who"><strong>Your family</strong><div class="muted">Everyone in the family</div></div><span class="badge badge--info">View and download</span></div>` : ''}
                  ${shares.map(
                    (s) => html`<div class="share-line"><div class="share-line__who"><strong>${s.recipientEmail}</strong>
                      <div class="muted">${s.permission === 'download' ? 'View and download' : 'View only'} · ${s.expiresAt ? `until ${formatDate(s.expiresAt)}` : 'until you stop'}</div></div>
                      <button class="btn btn--sm btn--ghost" type="button" data-action="revoke" data-share="${s.id}" aria-label="Stop sharing with ${s.recipientEmail}">${icon('close', { size: 16 })} Stop</button></div>`
                  )}
                  ${!shares.length && !doc.familyShared ? html`<p class="muted share-line">Only you can open this document.</p>` : ''}
                </section>`
              : ''}

            <section class="panel">
              <h2 class="panel__title">Recent activity</h2>
              ${events.length
                ? html`<ul class="event-list" role="list">${events.slice(0, 6).map((e) => eventRow(e, me()))}</ul>`
                : html`<p class="muted">Nothing recorded yet.</p>`}
              <a class="btn btn--ghost btn--sm" href="/app/activity">See all activity ${icon('arrow', { size: 16 })}</a>
            </section>
          </div>
        </div>
      </div>`
    );
  };

  const refreshPreviewPanel = () => render($('#preview', root), previewPanel());

  const loadSide = async () => {
    const [shareList, activity] = await Promise.all([
      isOwner() ? sharesForDocument(doc.id) : Promise.resolve([]),
      loadActivity({ docId: doc.id }).catch(() => ({ items: [] }))
    ]);
    shares = shareList;
    events = activity.items;
  };

  const reload = async () => {
    doc = await getDocument(params.id);
    if (!doc) return false;
    await loadSide();
    paint();
    return true;
  };

  render(root, html`<div class="page"><div class="skeleton"></div></div>`);
  try {
    if (!(await reload())) {
      render(root, html`<div class="page"><div class="empty"><div class="empty__art">${icon('file', { size: 28 })}</div><h3>Document not found</h3>
        <p>It may have been deleted, or it is no longer shared with you.</p><a class="btn btn--primary" href="/app">Back to vault</a></div></div>`);
      return;
    }
  } catch (error) {
    console.error(error);
    render(root, html`<div class="page"><div class="empty"><div class="empty__art">${icon('alert', { size: 28 })}</div><h3>We could not open this document</h3><p>${error.message}</p>
      <a class="btn btn--primary" href="/app">Back to vault</a></div></div>`);
    return;
  }

  const openEdit = async () => {
    let tagInput;
    const saved = await openModal({
      title: 'Edit details',
      confirmLabel: 'Save changes',
      body: html`<div class="form-grid">
        <div class="field"><label class="field__label" for="e-title">Title</label>
          <input class="input" id="e-title" name="title" maxlength="100" value="${doc.title}" required /></div>
        <div class="form-grid form-grid--2">
          <div class="field"><label class="field__label" for="e-cat">Category</label>
            <select class="select" id="e-cat" name="category">${CATEGORIES.map((c) => html`<option ${c === doc.category ? 'selected' : ''}>${c}</option>`)}</select></div>
          <div class="field"><label class="field__label" for="e-exp">Expires on</label>
            <input class="input" id="e-exp" name="expiresOn" type="date" value="${doc.expiresAt ? doc.expiresAt.toDate().toISOString().slice(0, 10) : ''}" /></div>
        </div>
        <div class="field"><span class="field__label">Tags</span><div id="e-tags"></div></div>
        <label class="check"><input type="checkbox" name="familyShared" ${doc.familyShared ? 'checked' : ''} ${getState().familyId ? '' : 'disabled'} />
          <span class="check__text"><strong>Visible to my family</strong><span>${getState().familyId ? 'Everyone in your family can open it.' : 'Start or join a family first.'}</span></span></label>
      </div>`,
      onOpen: (dialog) => {
        tagInput = mountTagInput(dialog.querySelector('#e-tags'), doc.tags || []);
      },
      onConfirm: async (_form, data) => {
        const changes = {
          title: String(data.get('title')).trim(),
          category: String(data.get('category')),
          expiresOn: String(data.get('expiresOn') || ''),
          tags: tagInput.get()
        };
        if (getState().familyId) changes.familyShared = Boolean(data.get('familyShared'));
        await updateDocument(doc.id, changes);
        return true;
      }
    });
    if (saved) {
      toast.ok('Details saved.');
      await reload();
    }
  };

  const off = delegate(root, 'click', {
    preview: async () => {
      previewState = 'loading';
      refreshPreviewPanel();
      try {
        const { blob, type } = await fetchFile(doc.id);
        if (type === 'image/heic') {
          previewState = 'unsupported';
        } else {
          releasePreview();
          previewUrl = URL.createObjectURL(blob);
          previewType = type;
          previewState = 'ready';
        }
        events = (await loadActivity({ docId: doc.id }).catch(() => ({ items: events }))).items;
        paint();
      } catch (error) {
        previewState = 'error';
        previewMessage = error.message;
        refreshPreviewPanel();
      }
    },
    download: async () => {
      try {
        const { blob } = await fetchFile(doc.id, { download: true });
        saveBlob(blob, downloadName(doc));
        toast.ok('Download started.');
        events = (await loadActivity({ docId: doc.id }).catch(() => ({ items: events }))).items;
        paint();
      } catch (error) {
        toast.error(error.message);
      }
    },
    share: async () => {
      if (await openShareDialog({ docs: [doc], docId: doc.id })) {
        toast.ok('Shared.');
        await reload();
      }
    },
    edit: openEdit,
    revoke: async (el) => {
      try {
        await revokeShare(el.dataset.share);
        toast.ok('Access removed.');
        await reload();
      } catch (error) {
        toast.error(error.message);
      }
    },
    leave: async () => {
      const ok = await confirmDialog({
        title: 'Remove this document?',
        message: 'It will disappear from your list. The owner can share it with you again.',
        confirmLabel: 'Remove',
        danger: true,
        onConfirm: () => revokeShare(doc.share.id)
      });
      if (ok) navigate('/app');
    },
    delete: async () => {
      const ok = await confirmDialog({
        title: `Delete “${doc.title}”?`,
        message: 'The sealed file, its key and every share are removed for good. This cannot be undone.',
        confirmLabel: 'Delete for good',
        danger: true,
        onConfirm: () => deleteDocument(doc.id)
      });
      if (ok) {
        toast.ok('Document deleted.');
        navigate('/app');
      }
    }
  });

  return () => {
    off();
    releasePreview();
  };
}
