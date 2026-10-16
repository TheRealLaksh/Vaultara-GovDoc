const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Handle both Firestore Timestamp and Date objects
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        + ', ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

// Short date only, for cards.
const formatDay = (timestamp) => {
    if (!timestamp) return 'Processing';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const checkAuth = () => {
    auth.onAuthStateChanged(user => {
        const path = window.location.pathname;
        const isPublicPage = path.endsWith('login.html') || path.endsWith('register.html') || path.endsWith('index.html') || path === '/';
        
        if (!user && !isPublicPage) {
            window.location.href = 'login.html';
        }
    });
};

// Escape any user-controlled text before putting it into innerHTML.
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Only PDF / JPEG / PNG data URLs are ever used as a download link.
const isSafeDataUrl = (url) =>
    typeof url === 'string' && /^data:(image\/(jpeg|png)|application\/pdf);base64,[A-Za-z0-9+\/=]+$/.test(url);

// Family IDs are bearer secrets: FAM- plus 16 random characters.
const generateFamilyId = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return 'FAM-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};
const isValidFamilyId = (id) => /^FAM-[A-Z0-9]{12,32}$/.test(id);

// --- Feedback UI (replaces alert / confirm) -------------------------------

const ICONS = { success: 'check-circle', error: 'warning-circle', info: 'info' };

// Inline message inside a .status element. Pass '' to clear.
const setStatus = (el, message, state = 'info') => {
    if (!el) return;
    el.textContent = '';
    if (!message) { el.removeAttribute('data-state'); return; }
    el.setAttribute('data-state', state);
    const icon = document.createElement('i');
    icon.className = `ph-bold ph-${ICONS[state] || 'info'}`;
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = message;
    el.append(icon, text);
};

// Small toast in the bottom corner.
const toast = (message, type = 'success') => {
    let region = document.getElementById('toastRegion');
    if (!region) {
        region = document.createElement('div');
        region.id = 'toastRegion';
        region.className = 'toast-region';
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', 'polite');
        document.body.appendChild(region);
    }
    const item = document.createElement('div');
    item.className = 'toast';
    item.dataset.type = type;
    const icon = document.createElement('i');
    icon.className = `ph-bold ph-${ICONS[type] || 'info'}`;
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = message;
    item.append(icon, text);
    region.appendChild(item);
    setTimeout(() => item.remove(), type === 'error' ? 7000 : 4500);
};

// Promise-based confirmation using a native <dialog>.
const confirmDialog = ({ title, message, confirmLabel = 'Confirm', danger = false }) => new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog';
    const h = document.createElement('h2');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-secondary';
    cancel.textContent = 'Cancel';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    ok.textContent = confirmLabel;
    actions.append(cancel, ok);
    dialog.append(h, p, actions);
    document.body.appendChild(dialog);

    const finish = (value) => { dialog.close(); dialog.remove(); resolve(value); };
    cancel.addEventListener('click', () => finish(false));
    ok.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
    dialog.showModal();
    cancel.focus();
});
