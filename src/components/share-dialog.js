import { html } from '../lib/dom.js';
import { openModal } from './modal.js';
import { shareDocument } from '../services/sharing.js';

const DURATIONS = [
  ['', 'Until I stop sharing'],
  ['1', '1 day'],
  ['7', '7 days'],
  ['30', '30 days'],
  ['90', '90 days']
];

// docs: [{ id, title }] the person owns. docId preselects one.
export function openShareDialog({ docs, docId = '' }) {
  return openModal({
    title: 'Share a document',
    confirmLabel: 'Share',
    body: html`<div class="form-grid">
      <div class="field">
        <label class="field__label" for="share-doc">Document</label>
        <select class="select" id="share-doc" name="docId" required>
          ${docId ? '' : html`<option value="">Choose a document</option>`}
          ${docs.map((d) => html`<option value="${d.id}" ${d.id === docId ? 'selected' : ''}>${d.title}</option>`)}
        </select>
      </div>
      <div class="field">
        <label class="field__label" for="share-email">Their email address</label>
        <input class="input" id="share-email" name="email" type="email" autocomplete="off" required autofocus />
        <p class="field__hint">They need a Vaultara account with a confirmed email.</p>
      </div>
      <div class="form-grid form-grid--2">
        <div class="field">
          <label class="field__label" for="share-perm">They can</label>
          <select class="select" id="share-perm" name="permission">
            <option value="view">View only</option>
            <option value="download">View and download</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label" for="share-days">For</label>
          <select class="select" id="share-days" name="days">
            ${DURATIONS.map(([value, label]) => html`<option value="${value}">${label}</option>`)}
          </select>
        </div>
      </div>
      <p class="field__hint">View only stops the download button. It cannot stop someone photographing their screen, so share with people you trust.</p>
    </div>`,
    onConfirm: async (_form, data) => {
      const id = String(data.get('docId'));
      if (!id) throw new Error('Choose a document to share.');
      await shareDocument({
        docId: id,
        email: String(data.get('email')).trim(),
        permission: String(data.get('permission')),
        days: data.get('days') ? Number(data.get('days')) : null
      });
      return true;
    }
  });
}
