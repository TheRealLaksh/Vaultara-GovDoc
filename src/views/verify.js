import { html, render, delegate } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { authLayout } from './auth-layout.js';
import { logout, refreshSession, resendVerification } from '../services/auth.js';
import { getState } from '../lib/store.js';
import { navigate } from '../lib/router.js';
import { toast } from '../components/toast.js';

export default function verifyView({ root }) {
  const email = getState().user.email;
  let cooldown = 0;
  let timer = null;

  const paint = () =>
    render(
      root,
      authLayout(html`<div class="verify-art">${icon('mail', { size: 38 })}</div>
        <div>
          <h1>Confirm your <em>email</em></h1>
          <p class="auth__sub">
            We sent a link to <strong>${email}</strong>. Open it, then come back here. Your vault opens as soon as the address is confirmed.
          </p>
        </div>
        <div class="stack">
          <button class="btn btn--primary btn--block" data-action="check" type="button">I have confirmed it</button>
          <button class="btn btn--block" data-action="resend" type="button" ${cooldown > 0 ? 'disabled' : ''}>
            ${cooldown > 0 ? `Send again in ${cooldown}s` : 'Send the link again'}
          </button>
          <button class="btn btn--ghost btn--block" data-action="logout" type="button">Use a different account</button>
        </div>
        <p class="auth__alt">Not there? Check your spam folder.</p>`)
    );

  const check = async (quiet = false) => {
    try {
      await refreshSession();
      if (getState().user?.emailVerified) navigate('/app', { replace: true });
      else if (!quiet) toast.error('Not confirmed yet. Open the link in the email first.');
    } catch {
      /* try again on the next poll */
    }
  };

  paint();
  const poll = setInterval(() => check(true), 5000);

  const off = delegate(root, 'click', {
    check: () => check(false),
    resend: async () => {
      try {
        await resendVerification();
        toast.ok('Link sent. Check your inbox.');
        cooldown = 60;
        paint();
        timer = setInterval(() => {
          cooldown -= 1;
          if (cooldown <= 0) clearInterval(timer);
          paint();
        }, 1000);
      } catch (error) {
        toast.error(error.message);
      }
    },
    logout: async () => {
      await logout();
      navigate('/login');
    }
  });

  return () => {
    clearInterval(poll);
    clearInterval(timer);
    off();
  };
}
