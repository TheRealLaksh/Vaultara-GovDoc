import { html, render, forms, $ } from '../lib/dom.js';
import { authLayout } from './auth-layout.js';
import { register } from '../services/auth.js';
import { passwordStrength } from '../lib/password.js';
import { navigate } from '../lib/router.js';

export default function registerView({ root }) {
  render(
    root,
    authLayout(html`<div>
        <h1>Create your <em>vault</em></h1>
        <p class="auth__sub">It takes a minute. You will confirm your email next.</p>
      </div>
      <form data-form="register" class="form-grid" novalidate>
        <div class="field">
          <label class="field__label" for="name">Your name</label>
          <input class="input" id="name" name="name" autocomplete="name" maxlength="80" required autofocus />
        </div>
        <div class="field">
          <label class="field__label" for="email">Email address</label>
          <input class="input" id="email" name="email" type="email" autocomplete="email" required />
        </div>
        <div class="field">
          <label class="field__label" for="password">Password</label>
          <input class="input" id="password" name="password" type="password" autocomplete="new-password" minlength="10" required aria-describedby="strength" />
          <div class="strength" id="strength" data-level="0" aria-live="polite">
            <div class="strength__bars"><i></i><i></i><i></i><i></i></div>
            <span class="strength__label" data-strength-label>Use 10 or more characters. A short sentence works well.</span>
          </div>
        </div>
        <label class="check">
          <input type="checkbox" name="terms" required />
          <span class="check__text"><span>I have read the <a href="/privacy">privacy notes</a> and understand that Vaultara is not end-to-end encrypted.</span></span>
        </label>
        <div class="form-error" role="alert" data-error></div>
        <button class="btn btn--primary btn--block" type="submit">Create account</button>
      </form>
      <p class="auth__alt">Already have an account? <a href="/login">Sign in</a></p>`)
  );

  const password = $('#password', root);
  const email = $('#email', root);
  const meter = $('#strength', root);
  const label = $('[data-strength-label]', root);
  const update = () => {
    if (!password.value) {
      meter.dataset.level = '0';
      label.textContent = 'Use 10 or more characters. A short sentence works well.';
      return;
    }
    const result = passwordStrength(password.value, email.value);
    meter.dataset.level = String(result.level);
    label.textContent = `${result.label}${result.ok ? '' : '. Use 10 or more characters and avoid common words.'}`;
  };
  password.addEventListener('input', update);
  email.addEventListener('input', update);

  return forms(root, {
    register: async (formEl, data) => {
      const box = $('[data-error]', root);
      box.textContent = '';
      const name = String(data.get('name')).trim();
      const mail = String(data.get('email')).trim();
      const pass = String(data.get('password'));
      if (!name) return void (box.textContent = 'Tell us your name.');
      if (!passwordStrength(pass, mail).ok) return void (box.textContent = 'Choose a stronger password: at least 10 characters, and no common words.');
      if (!data.get('terms')) return void (box.textContent = 'Please accept the privacy notes to continue.');
      try {
        await register({ name, email: mail, password: pass });
        navigate('/verify');
      } catch (error) {
        box.textContent = error.message;
      }
    }
  });
}
