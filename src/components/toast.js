import { html, render } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

let host;

function ensureHost() {
  if (host?.isConnected) return host;
  host = document.createElement('div');
  host.className = 'toasts';
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
  return host;
}

export function showToast(message, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  render(
    el,
    html`${icon(type === 'error' ? 'alert' : 'check')}<span>${message}</span
      ><button type="button" aria-label="Dismiss">${icon('close', { size: 16 })}</button>`
  );
  const remove = () => el.remove();
  el.querySelector('button').addEventListener('click', remove);
  ensureHost().appendChild(el);
  setTimeout(remove, type === 'error' ? 8000 : 4500);
}

export const toast = {
  ok: (message) => showToast(message, 'ok'),
  error: (message) => showToast(message, 'error')
};
