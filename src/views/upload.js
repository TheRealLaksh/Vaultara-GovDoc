import { html, render, delegate, forms, $ } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { getState } from '../lib/store.js';
import { formatBytes } from '../lib/format.js';
import { CATEGORIES, checkFile, uploadDocument } from '../services/vault.js';
import { mountTagInput } from '../components/tags.js';
import { toast } from '../components/toast.js';
import { navigate } from '../lib/router.js';

const titleFromName = (name) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 100);

export default function uploadView({ root }) {
  let file = null;
  const hasFamily = Boolean(getState().familyId);

  render(
    root,
    html`<div class="page page--narrow">
      <header class="page__head">
        <div>
          <a class="back-link" href="/app">${icon('back', { size: 16 })} Back to vault</a>
          <h1 class="page__title">Add a <em>document</em></h1>
          <p class="page__lede">PDF, JPEG, PNG, WebP or HEIC, up to 15MB. It is checked, sealed and filed in one go.</p>
        </div>
      </header>

      <form data-form="upload" class="stack stack--lg" novalidate>
        <div id="file-zone">
          <label class="drop" id="drop" for="file">
            <span class="drop__art">${icon('upload', { size: 26 })}</span>
            <strong>Drop a file here, or choose one</strong>
            <span class="muted">Scans and clear photos work best</span>
            <input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*" />
          </label>
        </div>

        <div class="panel stack">
          <div class="field">
            <label class="field__label" for="title">Title</label>
            <input class="input" id="title" name="title" maxlength="100" required placeholder="Passport, Class 12 marksheet..." />
          </div>
          <div class="form-grid form-grid--2">
            <div class="field">
              <label class="field__label" for="category">Category</label>
              <select class="select" id="category" name="category">${CATEGORIES.map((c) => html`<option>${c}</option>`)}</select>
            </div>
            <div class="field">
              <label class="field__label" for="expiresOn">Expires on <span class="opt">(optional)</span></label>
              <input class="input" id="expiresOn" name="expiresOn" type="date" />
              <p class="field__hint">We will flag it on your vault as it gets close.</p>
            </div>
          </div>
          <div class="field">
            <span class="field__label" id="tags-label">Tags <span class="opt">(press Enter after each)</span></span>
            <div id="tags" aria-labelledby="tags-label"></div>
          </div>
          <label class="check">
            <input type="checkbox" name="familyShared" ${hasFamily ? '' : 'disabled'} />
            <span class="check__text">
              <strong>Visible to my family</strong>
              <span>${hasFamily ? 'Everyone in your family can open this document.' : 'Start or join a family first to use this.'}</span>
            </span>
          </label>
        </div>

        <div class="form-error" role="alert" data-error></div>
        <div class="progress hidden" id="progress" role="progressbar" aria-label="Upload progress" aria-valuemin="0" aria-valuemax="100"><i></i></div>
        <p class="muted hidden" id="phase" aria-live="polite"></p>
        <div class="row">
          <button class="btn btn--primary" type="submit">${icon('lock', { size: 18 })} Seal and file</button>
          <a class="btn btn--ghost" href="/app">Cancel</a>
        </div>
      </form>
    </div>`
  );

  const tagInput = mountTagInput($('#tags', root));
  const showError = (message) => ($('[data-error]', root).textContent = message);

  const setFile = (picked) => {
    const problem = checkFile(picked);
    if (problem) {
      showError(problem);
      return;
    }
    showError('');
    file = picked;
    const titleField = $('#title', root);
    if (!titleField.value) titleField.value = titleFromName(picked.name);
    render(
      $('#file-zone', root),
      html`<div class="picked">
        <span class="doc-row__icon">${icon('file', { size: 22 })}</span>
        <div class="grow"><div class="picked__name">${picked.name}</div><div class="muted">${formatBytes(picked.size)}</div></div>
        <button class="btn btn--ghost btn--sm" type="button" data-action="remove">Choose a different file</button>
      </div>`
    );
  };

  const onChange = (event) => {
    if (event.target.id === 'file' && event.target.files[0]) setFile(event.target.files[0]);
  };
  root.addEventListener('change', onChange);

  const zone = () => $('#drop', root);
  const onOver = (event) => {
    if (!zone()) return;
    event.preventDefault();
    zone().classList.add('is-over');
  };
  const onLeave = () => zone()?.classList.remove('is-over');
  const onDrop = (event) => {
    if (!zone()) return;
    event.preventDefault();
    onLeave();
    if (event.dataTransfer.files[0]) setFile(event.dataTransfer.files[0]);
  };
  root.addEventListener('dragover', onOver);
  root.addEventListener('dragleave', onLeave);
  root.addEventListener('drop', onDrop);

  const offClick = delegate(root, 'click', {
    remove: () => {
      file = null;
      render(
        $('#file-zone', root),
        html`<label class="drop" id="drop" for="file"><span class="drop__art">${icon('upload', { size: 26 })}</span><strong>Drop a file here, or choose one</strong>
          <span class="muted">Scans and clear photos work best</span><input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*" /></label>`
      );
    }
  });

  const offForm = forms(root, {
    upload: async (formEl, data) => {
      showError('');
      const title = String(data.get('title')).trim();
      if (!file) return showError('Choose a file to add.');
      if (!title) return showError('Give the document a title.');

      const bar = $('#progress', root);
      const phase = $('#phase', root);
      bar.classList.remove('hidden');
      phase.classList.remove('hidden');
      try {
        const result = await uploadDocument(
          {
            file,
            title,
            category: String(data.get('category')),
            tags: tagInput.get(),
            expiresOn: String(data.get('expiresOn') || ''),
            familyShared: Boolean(data.get('familyShared'))
          },
          ({ phase: step, fraction }) => {
            bar.firstElementChild.style.width = `${Math.round((step === 'upload' ? fraction * 85 : 100))}%`;
            bar.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
            phase.textContent = step === 'upload' ? 'Uploading securely...' : 'Checking, sealing and filing...';
          }
        );
        toast.ok('Sealed and filed.');
        navigate(`/app/documents/${result.id}`);
      } catch (error) {
        bar.classList.add('hidden');
        phase.classList.add('hidden');
        showError(error.message || 'The upload failed. Please try again.');
      }
    }
  });

  return () => {
    root.removeEventListener('change', onChange);
    root.removeEventListener('dragover', onOver);
    root.removeEventListener('dragleave', onLeave);
    root.removeEventListener('drop', onDrop);
    offClick();
    offForm();
  };
}
