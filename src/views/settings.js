import { html, render, delegate, forms, $ } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { getState } from '../lib/store.js';
import { passwordStrength } from '../lib/password.js';
import { changePassword, enrolledFactors, finishTotpEnrollment, removeFactor, startTotpEnrollment, logout } from '../services/auth.js';
import { deleteAccount, exportData, saveProfile, setTheme } from '../services/account.js';
import { openModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { navigate } from '../lib/router.js';

const THEMES = [
  ['system', 'Match my device'],
  ['light', 'Daylight'],
  ['dark', 'Night']
];

export default function settingsView({ root }) {
  const paint = () => {
    const { user, profile, theme } = getState();
    const factors = enrolledFactors();
    render(
      root,
      html`<div class="page page--narrow">
        <header class="page__head"><div>
          <p class="eyebrow">Your account</p>
          <h1 class="page__title"><em>Settings</em></h1>
        </div></header>

        <section class="panel">
          <div class="panel__head"><div><h2 class="panel__title">Profile</h2></div></div>
          <form data-form="profile" class="form-grid" novalidate>
            <div class="field"><label class="field__label" for="name">Name</label>
              <input class="input" id="name" name="name" maxlength="80" value="${profile?.displayName || user.displayName || ''}" required /></div>
            <div class="field"><label class="field__label" for="mail">Email</label>
              <div class="row"><input class="input grow" id="mail" value="${user.email}" disabled />
                <span class="badge badge--ok">${icon('check', { size: 13 })} Confirmed</span></div></div>
            <div class="form-error" role="alert" data-error="profile"></div>
            <div><button class="btn btn--primary" type="submit">Save profile</button></div>
          </form>
        </section>

        <section class="panel">
          <div class="panel__head"><div><h2 class="panel__title">Appearance</h2></div></div>
          <div class="theme-choices">
            ${THEMES.map(([key, label]) => html`<button class="theme-choice" type="button" data-action="theme" data-theme="${key}" aria-pressed="${theme === key}">
              <span class="theme-swatch theme-swatch--${key}"></span>${label}</button>`)}
          </div>
        </section>

        <section class="panel">
          <div class="panel__head"><div><h2 class="panel__title">Sign in and security</h2>
            <p class="panel__sub">Sensitive changes ask for your password again.</p></div></div>
          <div class="method">${icon('key', { size: 22 })}<div class="method__text"><strong>Password</strong><div class="muted">Use something long that you do not use elsewhere.</div></div>
            <button class="btn btn--sm" type="button" data-action="password">Change</button></div>
          <div class="method">${icon('phone', { size: 22 })}<div class="method__text"><strong>Authenticator app</strong>
              <div class="muted">${factors.length ? 'On. A 6 digit code is asked at every sign in.' : 'Add a second step so a stolen password is not enough.'}</div></div>
            ${factors.length
              ? html`<button class="btn btn--sm btn--danger" type="button" data-action="mfa-off" data-factor="${factors[0].uid}">Turn off</button>`
              : html`<button class="btn btn--sm btn--primary" type="button" data-action="mfa-on">Turn on</button>`}</div>
          <div class="method">${icon('mail', { size: 22 })}<div class="method__text"><strong>Email link</strong>
              <div class="muted">You can always sign in with a link sent to ${user.email}, no password needed.</div></div></div>
        </section>

        <section class="panel">
          <div class="panel__head"><div><h2 class="panel__title">Your data</h2></div></div>
          <div class="method">${icon('download', { size: 22 })}<div class="method__text"><strong>Export my records</strong>
              <div class="muted">A JSON file with your profile, document details, shares and activity. Files are downloaded from the vault.</div></div>
            <button class="btn btn--sm" type="button" data-action="export">Export</button></div>
        </section>

        <section class="panel panel--danger">
          <div class="panel__head"><div><h2 class="panel__title">Delete account</h2>
            <p class="panel__sub">Removes every document, key, share and activity entry you created. This cannot be undone.</p></div></div>
          <button class="btn btn--danger" type="button" data-action="delete">${icon('trash', { size: 18 })} Delete my account</button>
        </section>
      </div>`
    );
  };
  paint();

  const passwordField = (id, label, extra = '') => html`<div class="field"><label class="field__label" for="${id}">${label}</label>
    <input class="input" id="${id}" name="${id}" type="password" autocomplete="${extra || 'current-password'}" required /></div>`;

  const offForms = forms(root, {
    profile: async (_form, data) => {
      const box = $('[data-error="profile"]', root);
      box.textContent = '';
      const displayName = String(data.get('name')).trim();
      if (!displayName) return void (box.textContent = 'Name cannot be empty.');
      try {
        await saveProfile({ displayName, theme: getState().profile?.theme || getState().theme });
        toast.ok('Profile saved.');
      } catch (error) {
        box.textContent = error.message;
      }
    }
  });

  const offClick = delegate(root, 'click', {
    theme: async (el) => {
      try {
        await setTheme(el.dataset.theme);
        paint();
      } catch (error) {
        toast.error(error.message);
      }
    },
    password: async () => {
      const done = await openModal({
        title: 'Change password',
        confirmLabel: 'Change password',
        body: html`<div class="form-grid">${passwordField('current', 'Current password')}${passwordField('next', 'New password', 'new-password')}${passwordField('again', 'New password again', 'new-password')}</div>`,
        onConfirm: async (_f, data) => {
          const next = String(data.get('next'));
          if (next !== String(data.get('again'))) throw new Error('The new passwords do not match.');
          if (!passwordStrength(next, getState().user.email).ok) throw new Error('Choose a stronger password: at least 10 characters, no common words.');
          await changePassword(String(data.get('current')), next);
        }
      });
      if (done) toast.ok('Password changed.');
    },
    'mfa-on': async () => {
      const setup = await openModal({
        title: 'Turn on two-step sign in',
        confirmLabel: 'Continue',
        body: html`<p>First, confirm it is you.</p><div class="form-grid">${passwordField('password', 'Your password')}</div>`,
        onConfirm: (_f, data) => startTotpEnrollment(String(data.get('password')))
      });
      if (!setup || setup === true) return;
      const done = await openModal({
        title: 'Scan this code',
        confirmLabel: 'Turn on',
        body: html`<div class="stack">
          <p>Open an authenticator app such as Google Authenticator, 1Password or Authy, and scan the code. Then type the 6 digit number it shows.</p>
          <img class="qr" src="${setup.qr}" alt="QR code for your authenticator app" />
          <p class="field__hint">Cannot scan? Enter this key by hand: <span class="mono">${setup.key}</span></p>
          <div class="field"><label class="field__label" for="totp">6 digit code</label>
            <input class="input code-input" id="totp" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required /></div>
        </div>`,
        onConfirm: (_f, data) => finishTotpEnrollment(setup.secret, String(data.get('code')))
      });
      if (done) {
        toast.ok('Two-step sign in is on.');
        paint();
      }
    },
    'mfa-off': async (el) => {
      const done = await openModal({
        title: 'Turn off two-step sign in?',
        confirmLabel: 'Turn off',
        danger: true,
        body: html`<p>Your account will be protected by your password alone.</p><div class="form-grid">${passwordField('password', 'Your password')}</div>`,
        onConfirm: (_f, data) => removeFactor(el.dataset.factor, String(data.get('password')))
      });
      if (done) {
        toast.ok('Two-step sign in is off.');
        paint();
      }
    },
    export: async (el) => {
      el.disabled = true;
      try {
        await exportData();
        toast.ok('Your export is downloading.');
      } catch (error) {
        toast.error(error.message);
      } finally {
        el.disabled = false;
      }
    },
    delete: async () => {
      const done = await openModal({
        title: 'Delete your account?',
        confirmLabel: 'Delete everything',
        danger: true,
        body: html`<div class="form-grid"><p>This permanently removes your documents, keys, shares and activity. Type <strong>DELETE</strong> and your password to confirm.</p>
          <div class="field"><label class="field__label" for="confirm">Type DELETE</label><input class="input" id="confirm" name="confirm" autocomplete="off" required /></div>
          ${passwordField('password', 'Your password')}</div>`,
        onConfirm: async (_f, data) => {
          if (String(data.get('confirm')).trim() !== 'DELETE') throw new Error('Type DELETE in capitals to confirm.');
          await deleteAccount(String(data.get('password')), 'DELETE');
        }
      });
      if (done) {
        toast.ok('Your account has been deleted.');
        try {
          await logout();
        } catch {
          /* already signed out */
        }
        navigate('/');
      }
    }
  });

  return () => {
    offForms();
    offClick();
  };
}
