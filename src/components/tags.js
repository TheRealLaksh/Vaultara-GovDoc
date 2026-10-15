import { html, render } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

// A small chip input. Returns { get() } so callers can read the tags on submit.
export function mountTagInput(host, initial = [], { max = 8 } = {}) {
  let tags = [...initial];
  const paint = () => {
    render(
      host,
      html`${tags.map(
        (t) => html`<span class="chip chip--tag">${t}<button type="button" data-remove="${t}" aria-label="Remove tag ${t}">${icon('close', { size: 12 })}</button></span>`
      )}<input type="text" maxlength="24" placeholder="${tags.length ? '' : 'passport, renewal...'}" aria-label="Add a tag" />`
    );
  };
  const add = (value) => {
    const tag = value.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim();
    if (tag && !tags.includes(tag) && tags.length < max) tags.push(tag);
  };
  host.classList.add('tags');
  host.addEventListener('keydown', (event) => {
    const input = event.target.closest('input');
    if (!input) return;
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(input.value);
      paint();
      host.querySelector('input').focus();
    } else if (event.key === 'Backspace' && !input.value && tags.length) {
      tags.pop();
      paint();
      host.querySelector('input').focus();
    }
  });
  host.addEventListener('focusout', (event) => {
    const input = event.target.closest('input');
    if (!input?.value.trim()) return;
    add(input.value);
    // Repainting inside a blur event can detach the element being clicked.
    setTimeout(() => host.isConnected && paint(), 0);
  });
  host.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove]');
    if (button) {
      tags = tags.filter((t) => t !== button.dataset.remove);
      paint();
      host.querySelector('input').focus();
    }
  });
  paint();
  return {
    get() {
      const pending = host.querySelector('input')?.value;
      if (pending?.trim()) add(pending);
      return [...tags];
    }
  };
}
