// AUTH HANDLER: one form, two modes (sign in / create account)

const authForm = document.getElementById('authForm');
const authStatus = document.getElementById('authError');
const authSubmit = document.getElementById('authSubmit');
const authTitle = document.getElementById('authTitle');
const authLede = document.getElementById('authLede');
const authSwitchText = document.getElementById('authSwitchText');
const authSwitchBtn = document.getElementById('authSwitchBtn');
const passwordInput = document.getElementById('password');
const passwordHint = document.getElementById('passwordHint');

let authMode = 'login';
let authBusy = false; // true while a sign-in / registration is in flight
const COPY = {
    login: {
        title: 'Welcome back',
        lede: 'Sign in to open your vault.',
        submit: 'Sign in',
        switchText: 'New to Vaultara?',
        switchBtn: 'Create an account',
        autocomplete: 'current-password',
    },
    register: {
        title: 'Create your vault',
        lede: 'One account for your documents and your family.',
        submit: 'Create account',
        switchText: 'Already have an account?',
        switchBtn: 'Sign in',
        autocomplete: 'new-password',
    },
};

function applyMode() {
    const c = COPY[authMode];
    if (authTitle) authTitle.textContent = c.title;
    if (authLede) authLede.textContent = c.lede;
    if (authSubmit) authSubmit.querySelector('.btn-label').textContent = c.submit;
    if (authSwitchText) authSwitchText.textContent = c.switchText;
    if (authSwitchBtn) authSwitchBtn.textContent = c.switchBtn;
    if (passwordInput) passwordInput.setAttribute('autocomplete', c.autocomplete);
    if (passwordHint) passwordHint.classList.toggle('hidden', authMode !== 'register');
    document.title = (authMode === 'login' ? 'Sign in' : 'Create account') + ' | Vaultara';
    setStatus(authStatus, '');
}

function toggleMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    applyMode();
    const email = document.getElementById('email');
    if (email) email.focus();
}

async function handleAuth(mode) {
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = passwordInput.value;
    setStatus(authStatus, '');

    if (!email || !password) {
        setStatus(authStatus, 'Please enter both email and password.', 'error');
        (email ? passwordInput : document.getElementById('email')).focus();
        return;
    }

    if (mode === 'register' && (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
        setStatus(authStatus, 'Password must be at least 8 characters and include a letter and a number.', 'error');
        passwordInput.focus();
        return;
    }

    // UI loading state
    const label = authSubmit.querySelector('.btn-label');
    const originalLabel = label.textContent;
    label.textContent = mode === 'login' ? 'Signing in…' : 'Creating account…';
    authSubmit.disabled = true;
    authBusy = true;

    try {
        if (mode === 'login') {
            await auth.signInWithEmailAndPassword(email, password);
            if (window.Logger) await Logger.log('LOGIN', 'User logged in securely');
        } else {
            await auth.createUserWithEmailAndPassword(email, password);
            // Create initial user profile doc
            const user = auth.currentUser;
            await db.collection('users').doc(user.uid).set({
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                aadhaarLinked: false
            });
            if (window.Logger) await Logger.log('REGISTER', 'New user account created');
            // Sharing and family access only work for verified emails, so send the link straight away.
            try { await user.sendEmailVerification(); } catch (e) { console.warn('Verification email not sent', e); }
        }

        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error(error);
        let msg = 'Something went wrong. Please try again.';

        // With email-enumeration protection on, Firebase reports both cases as invalid-credential.
        if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential'].includes(error.code)) msg = 'Incorrect email or password.';
        if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Please wait a few minutes and try again.';
        if (['auth/weak-password', 'auth/password-does-not-meet-requirements'].includes(error.code)) msg = 'Password is too weak. Use 8 or more characters with a letter and a number.';
        if (error.code === 'auth/email-already-in-use') msg = 'That email is already registered. Try signing in.';
        if (error.code === 'auth/invalid-email') msg = 'That email address does not look right.';
        if (error.code === 'auth/network-request-failed') msg = 'Network problem. Check your connection and try again.';

        setStatus(authStatus, msg, 'error');
        label.textContent = originalLabel;
        authSubmit.disabled = false;
        authBusy = false;
    }
}

if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAuth(authMode);
    });
}
if (authSwitchBtn) authSwitchBtn.addEventListener('click', toggleMode);

// Show / hide password
const togglePw = document.getElementById('togglePassword');
if (togglePw && passwordInput) {
    togglePw.addEventListener('click', () => {
        const show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        togglePw.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        togglePw.querySelector('i').className = `ph-bold ph-${show ? 'eye-slash' : 'eye'}`;
    });
}

// Already signed in? Go straight to the vault.
// (Skipped while handleAuth is running: registering signs the user in before the profile write finishes.)
auth.onAuthStateChanged(user => { if (user && !authBusy) window.location.replace('dashboard.html'); });

// Deep link: login.html?mode=register
if (new URLSearchParams(location.search).get('mode') === 'register') authMode = 'register';
applyMode();
