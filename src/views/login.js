import { html, render, forms, delegate, $ } from '../lib/dom.js';
import { authLayout } from './auth-layout.js';
import { completeMfa, finishLoginLink, isLoginLink, login, sendLoginLink } from '../services/auth.js';
import { navigate } from '../lib/router.js';
import { remember } from '../lib/store.js';
import { toast } from '../components/toast.js';

const nextPath = (query) => (query.next && query.next.startsWith('/app') ? query.next : '/app');

export default async function loginView({ root, query }) {
  let mode = 'password'; // password | link | link-sent | mfa | finishing
  let resolver = null;
  let linkEmail = '';

  const form = (body) => authLayout(body);

  const paint = () => {
    if (mode === 'finishing') {
      render(root, form(html`<div><h1>Signing you in<em>.</em></h1><p class="auth__sub">One moment.</p></div>`));
      return;
    }
    if (mode === 'link-sent') {
      render(
        root,
        form(html`<div>
            <h1>Check your <em>inbox</em></h1>
            <p class="auth__sub">We sent a sign in link to <strong>${linkEmail}</strong>. Open it on this device to continue.</p>
          </div>
          <button class="btn" type="button" data-action="back">Use a different method</button>`)
      );
      return;
    }
    if (mode === 'mfa') {
      render(
        root,
        form(html`<div>
            <h1>Two-step <em>check</em></h1>
            <p class="auth__sub">Enter the 6 digit code from your authenticator app.</p>
          </div>
          <form data-form="mfa" class="form-grid" novalidate>
            <div class="field">
              <label class="field__label" for="code">Authenticator code</label>
              <input class="input code-input" id="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required autofocus />
            </div>
            <div class="form-error" role="alert" data-error></div>
            <button class="btn btn--primary btn--block" type="submit">Verify and sign in</button>
          </form>`)
      );
      return;
    }
    const isLink = mode === 'link';
    render(
      root,
      form(html`<div>
          <h1>Welcome <em>back</em></h1>
          <p class="auth__sub">Sign in to open your vault.</p>
        </div>
        <form data-form="${isLink ? 'link' : 'password'}" class="form-grid" novalidate>
          <div class="field">
            <label class="field__label" for="email">Email address</label>
            <input class="input" id="email" name="email" type="email" autocomplete="email" required value="${linkEmail}" ${isLink ? 'autofocus' : ''} />
          </div>
          ${isLink
            ? ''
            : html`<div class="field">
                <div class="row row--between">
                  <label class="field__label" for="password">Password</label>
                  <a href="/forgot" class="field__hint">Forgot it?</a>
                </div>
                <input class="input" id="password" name="password" type="password" autocomplete="current-password" required />
              </div>`}
          <div class="form-error" role="alert" data-error></div>
          <button class="btn btn--primary btn--block" type="submit">${isLink ? 'Email me a sign in link' : 'Sign in'}</button>
        </form>
        <div class="or">or</div>
        <button class="btn btn--block" type="button" data-action="toggle">
          ${isLink ? 'Use my password instead' : 'Sign in with an email link'}
        </button>
        <p class="auth__alt">New to Vaultara? <a href="/register">Create an account</a></p>`)
    );
  };

  const showError = (message) => {
    const box = $('[data-error]', root);
    if (box) box.textContent = message;
  };

  const finish = () => navigate(nextPath(query), { replace: true });

  const offForms = forms(root, {
    password: async (formEl, data) => {
      showError('');
      linkEmail = String(data.get('email')).trim();
      try {
        const result = await login({ email: linkEmail, password: String(data.get('password')) });
        if (result.mfa) {
          resolver = result.mfa;
          mode = 'mfa';
          paint();
          return;
        }
        finish();
      } catch (error) {
        showError(error.message);
      }
    },
    mfa: async (formEl, data) => {
      showError('');
      try {
        await completeMfa(resolver, String(data.get('code')));
        finish();
      } catch (error) {
        showError(error.message);
      }
    },
    link: async (formEl, data) => {
      showError('');
      linkEmail = String(data.get('email')).trim();
      try {
        await sendLoginLink(linkEmail);
        mode = 'link-sent';
        paint();
      } catch (error) {
        showError(error.message);
      }
    }
  });

  const offClicks = delegate(root, 'click', {
    toggle: () => {
      const email = $('#email', root)?.value || linkEmail;
      linkEmail = email;
      mode = mode === 'link' ? 'password' : 'link';
      paint();
    },
    back: () => {
      mode = 'password';
      paint();
    }
  });

  // Returning from the emailed link.
  if (query.link && isLoginLink()) {
    mode = 'finishing';
    paint();
    let email = remember.get('emailForLink');
    if (!email) email = window.prompt('Confirm your email address to finish signing in') || '';
    try {
      await finishLoginLink(email.trim());
      finish();
    } catch (error) {
      mode = 'password';
      paint();
      toast.error(error.message);
    }
  } else {
    paint();
  }

  return () => {
    offForms();
    offClicks();
  };
}
