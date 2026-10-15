import './main.css';
import { configured } from './services/firebase.js';
import { defineRoutes, navigate, setGuard, startRouter } from './lib/router.js';
import { getState, subscribe } from './lib/store.js';
import { createShell } from './components/shell.js';
import { initAuth } from './services/auth.js';

const appRoot = document.getElementById('app');

if (!configured) {
  import('./views/setup.js').then((m) => m.default({ root: appRoot }));
} else {
  boot();
}

async function boot() {
  defineRoutes([
    { path: '/', title: '', guard: 'public', load: () => import('./views/landing.js') },
    { path: '/login', title: 'Sign in', guard: 'guest', load: () => import('./views/login.js') },
    { path: '/register', title: 'Create account', guard: 'guest', load: () => import('./views/register.js') },
    { path: '/forgot', title: 'Reset password', guard: 'guest', load: () => import('./views/forgot.js') },
    { path: '/verify', title: 'Verify your email', guard: 'verify', load: () => import('./views/verify.js') },
    { path: '/privacy', title: 'Privacy', guard: 'public', doc: 'privacy', load: () => import('./views/legal.js') },
    { path: '/security', title: 'Security', guard: 'public', doc: 'security', load: () => import('./views/legal.js') },
    { path: '/app', title: 'Vault', guard: 'app', layout: 'app', load: () => import('./views/vault.js') },
    { path: '/app/upload', title: 'Add a document', guard: 'app', layout: 'app', load: () => import('./views/upload.js') },
    { path: '/app/documents/:id', title: 'Document', guard: 'app', layout: 'app', load: () => import('./views/document.js') },
    { path: '/app/sharing', title: 'Sharing', guard: 'app', layout: 'app', load: () => import('./views/sharing.js') },
    { path: '/app/family', title: 'Family', guard: 'app', layout: 'app', load: () => import('./views/family.js') },
    { path: '/app/activity', title: 'Activity', guard: 'app', layout: 'app', load: () => import('./views/activity.js') },
    { path: '/app/settings', title: 'Settings', guard: 'app', layout: 'app', load: () => import('./views/settings.js') },
    { path: '/404', title: 'Page not found', guard: 'public', load: () => import('./views/notfound.js') }
  ]);

  setGuard((route, url) => {
    const { user } = getState();
    const verified = Boolean(user?.emailVerified);
    if (route.guard === 'app') {
      if (!user) return `/login?next=${encodeURIComponent(url.pathname + url.search)}`;
      if (!verified) return '/verify';
    }
    if (route.guard === 'guest' && user && verified && !url.searchParams.has('link')) return '/app';
    if (route.guard === 'verify') {
      if (!user) return '/login';
      if (verified) return '/app';
    }
    return null;
  });

  let shell = null;
  const host = {
    async mount(route) {
      if (route.layout === 'app') {
        if (!shell || !shell.el.isConnected) {
          appRoot.replaceChildren();
          shell = createShell(appRoot);
        }
        shell.setActive(location.pathname);
        const main = shell.main;
        main.replaceChildren();
        return main;
      }
      if (shell) {
        shell.destroy();
        shell = null;
      }
      appRoot.replaceChildren();
      appRoot.className = '';
      const page = document.createElement('div');
      page.id = 'view';
      page.tabIndex = -1;
      appRoot.appendChild(page);
      return page;
    }
  };

  await initAuth();
  document.documentElement.dataset.ready = 'true';

  // Signing out in another tab, or an expired session, sends people home.
  subscribe((state) => {
    if (state.ready && !state.user && location.pathname.startsWith('/app')) navigate('/login', { replace: true });
  });

  startRouter(host);
}
