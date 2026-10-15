import { html, render, forms, $ } from '../lib/dom.js';
import { authLayout } from './auth-layout.js';
import { resetPassword } from '../services/auth.js';

export default function forgotView({ root }) {
  const paint = (sentTo = '') =>
    render(
      root,
      authLayout(
        sentTo
          ? html`<div>
                <h1>Check your <em>inbox</em></h1>
                <p class="auth__sub">If an account exists for <strong>${sentTo}</strong>, a reset link is on its way. It can take a minute to arrive.</p>
              </div>
              <a class="btn btn--block" href="/login">Back to sign in</a>`
          : html`<div>
                <h1>Reset your <em>password</em></h1>
                <p class="auth__sub">Enter your email and we will send you a link. Your documents are not affected.</p>
              </div>
              <form data-form="reset" class="form-grid" novalidate>
                <div class="field">
                  <label class="field__label" for="email">Email address</label>
                  <input class="input" id="email" name="email" type="email" autocomplete="email" required autofocus />
                </div>
                <div class="form-error" role="alert" data-error></div>
                <button class="btn btn--primary btn--block" type="submit">Send reset link</button>
              </form>
              <p class="auth__alt"><a href="/login">Back to sign in</a></p>`
      )
    );
  paint();

  return forms(root, {
    reset: async (formEl, data) => {
      const email = String(data.get('email')).trim();
      try {
        await resetPassword(email);
      } catch (error) {
        // Do not reveal whether the address has an account.
        if (error.code === 'auth/invalid-email') return void ($('[data-error]', root).textContent = error.message);
      }
      paint(email);
    }
  });
}
