import { html, render, delegate } from '../lib/dom.js';
import { icon, logoMark } from '../lib/icons.js';
import { getState, subscribe } from '../lib/store.js';
import { initials } from '../lib/format.js';
import { logout } from '../services/auth.js';
import { setTheme } from '../services/account.js';
import { navigate } from '../lib/router.js';
import { toast } from './toast.js';

const NAV = [
  { href: '/app', label: 'Vault', icon: 'vault', match: (p) => p === '/app' || p.startsWith('/app/documents') },
  { href: '/app/upload', label: 'Add document', icon: 'upload', match: (p) => p === '/app/upload' },
  { href: '/app/sharing', label: 'Sharing', icon: 'share', match: (p) => p === '/app/sharing' },
  { href: '/app/family', label: 'Family', icon: 'family', match: (p) => p === '/app/family' },
  { href: '/app/activity', label: 'Activity', icon: 'activity', match: (p) => p === '/app/activity' },
  { href: '/app/settings', label: 'Settings', icon: 'settings', match: (p) => p === '/app/settings' }
];

const THEME_NEXT = { system: 'light', light: 'dark', dark: 'system' };
const THEME_ICON = { system: 'sun', light: 'sun', dark: 'moon' };

export function createShell(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'app';
  container.appendChild(wrapper);

  const paint = () => {
    const { user, profile, theme } = getState();
    const name = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'You';
    const path = location.pathname;
    render(
      wrapper,
      html`<aside class="sidebar" id="sidebar" aria-label="Main">
          <a class="brand" href="/app">${logoMark(34)}<span>Vaultara</span></a>
          <nav class="nav" aria-label="Sections">
            <span class="eyebrow nav__label">Your papers</span>
            ${NAV.map(
              (item) => html`<a class="nav__item" href="${item.href}" ${item.match(path) ? html`aria-current="page"` : ''}>
                ${icon(item.icon)}<span>${item.label}</span>
              </a>`
            )}
          </nav>
          <div class="sidebar__foot">
            <button class="btn btn--ghost btn--sm" data-action="shell-theme" type="button" title="Change theme">
              ${icon(THEME_ICON[theme] || 'sun', { size: 18 })}<span>Theme: ${theme || 'system'}</span>
            </button>
            <div class="who">
              <span class="avatar" aria-hidden="true">${initials(name)}</span>
              <div class="who__text">
                <div class="who__name">${name}</div>
                <div class="who__mail">${user?.email}</div>
              </div>
              <button class="btn btn--ghost btn--icon btn--sm" data-action="shell-logout" type="button" aria-label="Sign out">
                ${icon('logout', { size: 18 })}
              </button>
            </div>
          </div>
        </aside>
        <div class="scrim hidden" data-action="shell-close-nav"></div>
        <div>
          <header class="topbar">
            <button class="btn btn--ghost btn--icon" data-action="shell-open-nav" type="button" aria-label="Open menu" aria-controls="sidebar">
              ${icon('menu')}
            </button>
            <a class="brand" href="/app">${logoMark(28)}<span>Vaultara</span></a>
            <a class="btn btn--primary btn--icon btn--sm" href="/app/upload" aria-label="Add document">${icon('plus', { size: 18 })}</a>
          </header>
          <main class="main" id="view" tabindex="-1"></main>
        </div>`
    );
  };

  const setNav = (open) => {
    wrapper.classList.toggle('nav-open', open);
    wrapper.querySelector('.scrim')?.classList.toggle('hidden', !open);
  };

  delegate(wrapper, 'click', {
    'shell-open-nav': () => setNav(true),
    'shell-close-nav': () => setNav(false),
    'shell-theme': async () => {
      const next = THEME_NEXT[getState().theme] || 'light';
      try {
        await setTheme(next);
      } catch {
        /* theme still applied locally */
      }
    },
    'shell-logout': async () => {
      try {
        await logout();
        navigate('/');
      } catch (error) {
        toast.error(error.message);
      }
    }
  });
  wrapper.addEventListener('click', (event) => {
    if (event.target.closest('.nav__item')) setNav(false);
  });

  paint();
  const unsubscribe = subscribe(() => {
    if (!wrapper.isConnected) return unsubscribe();
    // Repaint only the chrome. The <main> element is swapped back in so views
    // that hold a reference to it keep working.
    const main = wrapper.querySelector('#view');
    paint();
    wrapper.querySelector('#view').replaceWith(main);
  });

  return {
    el: wrapper,
    get main() {
      return wrapper.querySelector('#view');
    },
    refresh: paint,
    setActive(path) {
      wrapper.querySelectorAll('.nav__item').forEach((a, i) => {
        if (NAV[i].match(path)) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      setNav(false);
    },
    destroy() {
      unsubscribe();
      wrapper.remove();
    }
  };
}
