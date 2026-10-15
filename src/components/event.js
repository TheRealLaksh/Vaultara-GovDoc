import { html } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { formatTime, relativeTime, dayKey, dayLabel } from '../lib/format.js';
import { ACTIONS, describe } from '../services/activity.js';

export function eventRow(entry, meId) {
  const meta = ACTIONS[entry.action] || { icon: 'info' };
  const { title, sub } = describe(entry, meId);
  return html`<li class="event">
    <span class="event__icon">${icon(meta.icon, { size: 18 })}</span>
    <div>
      <div class="event__title">${title}</div>
      ${sub ? html`<div class="event__sub">${sub}</div>` : ''}
    </div>
    <time class="event__time" title="${entry.createdAt?.toDate?.().toLocaleString?.() || ''}">${formatTime(entry.createdAt)}</time>
  </li>`;
}

// Groups entries by day, newest first, preserving the incoming order.
export function timeline(entries, meId) {
  const groups = new Map();
  entries.forEach((entry) => {
    const key = dayKey(entry.createdAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });
  return [...groups.entries()].map(
    ([key, items]) => html`<section class="timeline__day">
      <h3 class="eyebrow timeline__label">${dayLabel(key)}</h3>
      <ul class="event-list" role="list">${items.map((e) => eventRow(e, meId))}</ul>
    </section>`
  );
}

export { relativeTime };
