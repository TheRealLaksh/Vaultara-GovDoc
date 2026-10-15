// Minimal history router with :params, lazy views, guards and cleanups.
const routes = [];
let current = null;
let guardFn = () => null;
let rootEl = null;
let renderToken = 0;

export function defineRoutes(list) {
  list.forEach((r) => {
    const keys = [];
    const pattern = r.path.replace(/:([A-Za-z]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    routes.push({ ...r, regex: new RegExp(`^${pattern}/?$`), keys });
  });
}

export function setGuard(fn) {
  guardFn = fn;
}

function match(pathname) {
  for (const route of routes) {
    const m = route.regex.exec(pathname);
    if (m) {
      const params = {};
      route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { route, params };
    }
  }
  return null;
}

export function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  return resolve();
}

export async function resolve() {
  const token = ++renderToken;
  const url = new URL(location.href);
  const found = match(url.pathname) || match('/404');
  const redirect = guardFn(found.route, url);
  if (redirect && redirect !== url.pathname + url.search) {
    history.replaceState({}, '', redirect);
    return resolve();
  }

  if (current?.cleanup) {
    try {
      current.cleanup();
    } catch (error) {
      console.error(error);
    }
  }
  current = null;

  const module = await found.route.load();
  if (token !== renderToken) return; // a newer navigation won

  const ctx = {
    params: found.params,
    query: Object.fromEntries(url.searchParams),
    route: found.route,
    navigate
  };
  const host = await rootEl.mount(found.route, ctx);
  if (token !== renderToken) return;
  const cleanup = await module.default({ ...ctx, root: host });
  if (token !== renderToken) {
    if (typeof cleanup === 'function') cleanup();
    return;
  }
  current = { cleanup: typeof cleanup === 'function' ? cleanup : null };
  document.title = found.route.title ? `${found.route.title} | Vaultara` : 'Vaultara | Your documents, kept safe';
  window.scrollTo({ top: 0 });
}

// host.mount(route, ctx) returns the element a view should render into.
export function startRouter(host) {
  rootEl = host;
  window.addEventListener('popstate', resolve);
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download') || link.dataset.external !== undefined) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    // In-page anchors are left to the browser.
    if (url.hash && url.pathname === location.pathname && url.search === location.search) return;
    event.preventDefault();
    navigate(url.pathname + url.search);
  });
  return resolve();
}
