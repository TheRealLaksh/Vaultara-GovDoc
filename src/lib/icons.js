import { raw } from './dom.js';

// Hand-drawn style line icons on a 24 grid. Stroke follows currentColor.
const PATHS = {
  vault: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5v-1M12 16.5v-1M8.5 12h-1M16.5 12h1"/>',
  upload: '<path d="M12 16V4m0 0l-4 4m4-4l4 4"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="6" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><path d="M8.2 10.8l7-3.6M8.2 13.2l7 3.6"/>',
  family: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M2.5 19c.4-3.2 2.6-5 5.5-5s5.1 1.8 5.5 5"/><path d="M14.5 14.4c.8-.3 1.6-.4 2.5-.4 2.2 0 3.8 1.3 4.2 4"/>',
  activity: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  logout: '<path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3"/><path d="M16 8l4 4-4 4M20 12H9"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  download: '<path d="M12 4v12m0 0l-4-4m4 4l4-4"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9L17.5 7M10 11v5M14 11v5"/>',
  edit: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3z"/><path d="M14 8l3 3"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3M14 9l2 2"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 7.8-7.5 9.5-4.3-1.7-7.5-5-7.5-9.5V6L12 3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7.5L12 13l8.5-5.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  alert: '<path d="M12 4l9 15.5H3L12 4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>',
  copy: '<rect x="8" y="8" width="11.5" height="11.5" rx="2"/><path d="M5 15.5V6a2 2 0 012-2h9.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 0010.5 10.5z"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.6-4 3.7-6 7.5-6s6.9 2 7.5 6"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/>',
  file: '<path d="M14 3.5H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V8.5l-5-5z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h4"/>',
  id: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M5.8 16c.4-1.6 1.6-2.3 3.2-2.3s2.8.7 3.2 2.3M14.5 10h4M14.5 13.5h3"/>',
  cap: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5z"/><path d="M6.5 11.8V16c0 1.2 2.5 2.5 5.5 2.5s5.5-1.3 5.5-2.5v-4.2M21.5 9.5V15"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.8 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.7.8-2.7 2s1 1.7 2.7 2.1c1.8.4 2.9 1 2.9 2.3s-1.2 2.1-2.9 2.1c-1.4 0-2.5-.6-3-1.6M12 6.5v1.3M12 16.2v1.3"/>',
  home: '<path d="M4 11l8-6.5 8 6.5v8a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19v-8z"/><path d="M10 20.5v-5h4v5"/>',
  folder: '<path d="M3.5 7a2 2 0 012-2H10l2 2.5h6.5a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2V7z"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  arrow: '<path d="M5 12h14m0 0l-5-5m5 5l-5 5"/>',
  back: '<path d="M19 12H5m0 0l5-5m-5 5l5 5"/>'
};

export function icon(name, { size = 20, label = '' } = {}) {
  const body = PATHS[name] || PATHS.file;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return raw(
    `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`
  );
}

export const categoryIcon = (category) =>
  ({ Identity: 'id', Education: 'cap', Health: 'heart', Finance: 'coin', Property: 'home' })[category] || 'file';

// The Vaultara seal: a ring of stitches around a V, with a small gold pin.
export function logoMark(size = 32) {
  return raw(`<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="30" class="seal-fill"/>
    <circle cx="32" cy="32" r="25" fill="none" class="seal-ring" stroke-width="1.5" stroke-dasharray="2 3"/>
    <path d="M20 22l12 22 12-22" fill="none" class="seal-v" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="22" r="3.2" class="seal-pin"/>
  </svg>`);
}
