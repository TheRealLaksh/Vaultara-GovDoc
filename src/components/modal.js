import { html, render } from '../lib/dom.js';

let counter = 0;

// Opens a native <dialog>. Resolves with the value returned by onConfirm
// (or true when there is no onConfirm), or null if the person cancels.
export function openModal({
  title,
  body = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  hideConfirm = false,
  onConfirm = null,
  onOpen = null
}) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    const titleId = `modal-title-${++counter}`;
    dialog.className = 'modal';
    dialog.setAttribute('aria-labelledby', titleId);

    render(
      dialog,
      html`<form class="modal__inner" novalidate>
        <h2 class="modal__title" id="${titleId}">${title}</h2>
        <div class="modal__body">${body}</div>
        <div class="form-error" data-error role="alert"></div>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost" data-cancel>${cancelLabel}</button>
          ${hideConfirm
            ? ''
            : html`<button type="submit" class="btn ${danger ? 'btn--danger-solid' : 'btn--primary'}" data-confirm>
                ${confirmLabel}
              </button>`}
        </div>
      </form>`
    );

    let result = null;
    const form = dialog.querySelector('form');
    const errorBox = dialog.querySelector('[data-error]');
    const confirmButton = dialog.querySelector('[data-confirm]');

    dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(result);
    });
    // Clicking the backdrop closes the dialog.
    dialog.addEventListener('mousedown', (event) => {
      if (event.target === dialog) dialog.close();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.textContent = '';
      if (!onConfirm) {
        result = true;
        dialog.close();
        return;
      }
      confirmButton.disabled = true;
      const original = confirmButton.textContent;
      confirmButton.textContent = 'Working...';
      try {
        const value = await onConfirm(form, new FormData(form));
        result = value === undefined ? true : value;
        dialog.close();
      } catch (error) {
        errorBox.textContent = error.message || 'Something went wrong.';
        confirmButton.disabled = false;
        confirmButton.textContent = original;
      }
    });

    document.body.appendChild(dialog);
    dialog.showModal();
    onOpen?.(dialog, form);
    (dialog.querySelector('[autofocus], input, select, textarea') || confirmButton)?.focus();
  });
}

export const confirmDialog = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm = null }) =>
  openModal({ title, body: html`<p>${message}</p>`, confirmLabel, danger, onConfirm }).then(Boolean);
