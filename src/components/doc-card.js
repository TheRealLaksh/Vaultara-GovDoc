import { html } from '../lib/dom.js';
import { categoryIcon, icon } from '../lib/icons.js';
import { expiryStatus, formatBytes, formatDate, refNumber } from '../lib/format.js';

const TYPE = { 'application/pdf': 'PDF', 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP', 'image/heic': 'HEIC' };

export const typeLabel = (doc) => TYPE[doc.mimeType] || 'File';

export function stampFor(doc) {
  if (doc.access === 'shared') return html`<span class="stamp stamp--info">Shared with you</span>`;
  if (doc.access === 'family') return html`<span class="stamp stamp--gold">Family</span>`;
  if (doc.sharedWithUids?.length || doc.familyShared) return html`<span class="stamp stamp--info">Shared</span>`;
  return html`<span class="stamp stamp--ok">Private</span>`;
}

export function expiryLine(doc) {
  const status = expiryStatus(doc.expiresAt);
  if (!status) return html`<span>No expiry</span>`;
  const badge = { danger: 'badge--danger', warn: 'badge--warn', ok: '' }[status.tone];
  return html`<span class="badge ${badge}">${icon('clock', { size: 13 })}${status.label}</span>`;
}

export function docCard(doc) {
  return html`<a class="doc-card rise" href="/app/documents/${doc.id}">
    <span class="doc-tab">${icon(categoryIcon(doc.category), { size: 14 })}${doc.category}</span>
    <div class="doc-card__top">
      <div>
        <h3 class="doc-card__title">${doc.title}</h3>
        <p class="doc-card__meta">${typeLabel(doc)} · ${formatBytes(doc.size)} · added ${formatDate(doc.createdAt, 'just now')}</p>
      </div>
      ${stampFor(doc)}
    </div>
    ${doc.tags?.length ? html`<div class="row">${doc.tags.slice(0, 3).map((t) => html`<span class="chip chip--tag">${t}</span>`)}</div>` : ''}
    <div class="doc-card__foot"><span class="mono">${refNumber(doc.id)}</span>${expiryLine(doc)}</div>
  </a>`;
}

export function docRow(doc) {
  return html`<a class="doc-row rise" href="/app/documents/${doc.id}">
    <span class="doc-row__icon">${icon(categoryIcon(doc.category), { size: 20 })}</span>
    <div class="doc-row__body">
      <div class="doc-row__title">${doc.title}</div>
      <div class="doc-row__meta">${doc.category} · ${typeLabel(doc)} · ${formatBytes(doc.size)} · <span class="mono">${refNumber(doc.id)}</span></div>
    </div>
    ${expiryLine(doc)} ${stampFor(doc)}
  </a>`;
}
