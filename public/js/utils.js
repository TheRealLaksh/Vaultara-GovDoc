const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Handle both Firestore Timestamp and Date objects
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
