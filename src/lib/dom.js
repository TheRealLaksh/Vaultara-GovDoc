// Safe HTML templating. Everything interpolated into html`...` is escaped
// unless it is itself the result of html`...` or raw(). Never concatenate user
// data into markup any other way.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export const raw = (value) => new SafeHtml(String(value));

const part = (value) => {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(part).join('');
  if (value === null || value === undefined || value === false || value === true) return '';
  return esc(value);
};

export function html(strings, ...values) {
  let out = '';
  strings.forEach((chunk, i) => {
    out += chunk;
    if (i < values.length) out += part(values[i]);
  });
  return new SafeHtml(out);
}

export const render = (el, safe) => {
  el.innerHTML = String(safe);
};

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Event delegation keyed by data-action. Inline handlers are not used, so the
// strict Content-Security-Policy can stay in place.
export function delegate(root, type, handlers) {
  const listener = (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || !root.contains(target)) return;
    const handler = handlers[target.dataset.action];
    if (handler) handler(target, event);
  };
  root.addEventListener(type, listener);
  return () => root.removeEventListener(type, listener);
}

// Submit handlers keyed by data-form. Prevents default and disables double submits.
export function forms(root, handlers) {
  const listener = async (event) => {
    const form = event.target.closest('form[data-form]');
    if (!form || !root.contains(form)) return;
    event.preventDefault();
    const handler = handlers[form.dataset.form];
    if (!handler || form.dataset.busy === '1') return;
    form.dataset.busy = '1';
    const buttons = $$('button[type="submit"]', form);
    buttons.forEach((b) => (b.disabled = true));
    try {
      await handler(form, new FormData(form), event);
    } finally {
      form.dataset.busy = '0';
      buttons.forEach((b) => (b.disabled = false));
    }
  };
  root.addEventListener('submit', listener);
  return () => root.removeEventListener('submit', listener);
}

export const debounce = (fn, ms = 200) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};
