checkAuth();

const docGrid = document.getElementById('docGrid');
const searchBar = document.getElementById('searchBar');
const categoryFilter = document.getElementById('categoryFilter');
const docCountDisplay = document.getElementById('docCountDisplay');
const docCountLabel = document.getElementById('docCountLabel');
const verifyBanner = document.getElementById('verifyBanner');

let allDocs = [];

const CATEGORY_ICONS = { Identity: 'identification-card', Education: 'graduation-cap', Health: 'heartbeat' };
const ACCESS = {
    OWNER: { cls: 'badge-owner', label: 'Yours', icon: 'lock-simple' },
    SHARED: { cls: 'badge-shared', label: 'Shared with you', icon: 'share-network' },
    FAMILY: { cls: 'badge-family', label: 'Family', icon: 'users-three' },
};

// Verification Logic
window.sendVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await user.sendEmailVerification();
        toast(`Verification link sent to ${user.email}. Check your inbox and spam folder.`);
    } catch (error) {
        console.error(error);
        toast('Could not send the link. Please try again in a minute.', 'error');
    }
};

const sendVerifyBtn = document.getElementById('sendVerifyBtn');
if (sendVerifyBtn) sendVerifyBtn.addEventListener('click', () => window.sendVerification());

auth.onAuthStateChanged(async user => {
    if (!user) return;
    const myEmail = (user.email || '').toLowerCase();

    // CHECK VERIFICATION STATUS
    if (verifyBanner) verifyBanner.classList.toggle('hidden', user.emailVerified);

    try {
        // Shared and family access need a verified email (enforced by the security rules).
        // After clicking the email link, refresh the token so the rules see the change.
        if (!user.emailVerified) {
            await user.reload();
            if (user.emailVerified && verifyBanner) verifyBanner.classList.add('hidden');
        }
        // The rules read email_verified from the ID token, which can be stale if the email was
        // verified after the token was issued. Refresh it once when the claim disagrees.
        if (user.emailVerified) {
            const { claims } = await user.getIdTokenResult();
            if (!claims.email_verified) await user.getIdToken(true);
        }

        // 1. Get User Profile for Family ID
        let myFamilyId = null;
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) myFamilyId = userDoc.data().familyId;

        // 2. Owned documents always; shared + family only for verified accounts
        // A failed shared/family query must not hide the user's own documents.
        const empty = { docs: [] };
        const soft = (label) => (err) => { console.warn(`${label} query failed`, err.code || err); return empty; };
        const ownedQ = db.collection('documents').where('ownerId', '==', user.uid).get();
        const sharedQ = user.emailVerified
            ? db.collection('documents').where('sharedWith', 'array-contains', myEmail).get().catch(soft('Shared'))
            : Promise.resolve(empty);
        const familyQ = (user.emailVerified && myFamilyId && isValidFamilyId(myFamilyId))
            ? db.collection('documents').where('familyId', '==', myFamilyId).get().catch(soft('Family'))
            : Promise.resolve(empty);

        // 3. Execute All
        const [ownedRes, sharedRes, familyRes] = await Promise.all([ownedQ, sharedQ, familyQ]);

        const ownedDocs = ownedRes.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'OWNER' }));
        const sharedDocs = sharedRes.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'SHARED' }));
        const familyDocs = familyRes.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'FAMILY' }));

        // 4. Merge & deduplicate
        const uniqueMap = new Map();
        [...ownedDocs, ...sharedDocs, ...familyDocs].forEach(doc => {
            if (!uniqueMap.has(doc.id)) {
                if (doc.type === 'FAMILY' && doc.ownerId === user.uid) doc.type = 'OWNER';
                uniqueMap.set(doc.id, doc);
            }
        });

        allDocs = Array.from(uniqueMap.values()).sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
            return dateB - dateA;
        });

        updateCount();
        filterDocs();
    } catch (error) {
        console.error('Error loading docs:', error);
        renderError();
    }
});

function updateCount() {
    if (docCountDisplay) docCountDisplay.textContent = allDocs.length;
    if (docCountLabel) docCountLabel.textContent = allDocs.length === 1 ? 'document' : 'documents';
}

function renderError() {
    if (!docGrid) return;
    docGrid.innerHTML = `
        <div class="empty" role="alert">
            <i class="ph-bold ph-warning-circle" aria-hidden="true"></i>
            <h2>We could not load your vault</h2>
            <p>Check your connection and try again. If it keeps happening, sign out and back in.</p>
            <button type="button" class="btn btn-secondary" id="retryBtn">Try again</button>
        </div>`;
    document.getElementById('retryBtn').addEventListener('click', () => location.reload());
}

function renderEmpty(filtered) {
    docGrid.innerHTML = filtered
        ? `<div class="empty">
               <i class="ph-bold ph-magnifying-glass" aria-hidden="true"></i>
               <h2>No documents match</h2>
               <p>Try a different name or choose All categories.</p>
           </div>`
        : `<div class="empty">
               <i class="ph-bold ph-folder-open" aria-hidden="true"></i>
               <h2>Your vault is empty</h2>
               <p>Upload a PDF, JPEG or PNG up to 500 KB. You decide later who else can see it.</p>
               <a href="upload.html" class="btn btn-primary"><i class="ph-bold ph-upload-simple" aria-hidden="true"></i>Upload your first document</a>
           </div>`;
}

function renderDocs(docs, filtered = false) {
    if (!docGrid) return;
    docGrid.setAttribute('aria-busy', 'false');
    docGrid.innerHTML = '';

    if (docs.length === 0) {
        renderEmpty(filtered);
        return;
    }

    docs.forEach((doc, index) => {
        const card = document.createElement('article');
        card.className = 'doc-card';
        card.style.setProperty('--i', Math.min(index, 12));

        const access = ACCESS[doc.type] || ACCESS.OWNER;
        const cat = CATEGORY_ICONS[doc.category] ? doc.category : '';
        const icon = CATEGORY_ICONS[doc.category] || 'file-text';
        const name = escapeHtml(doc.fileName);

        const download = isSafeDataUrl(doc.fileData)
            ? `<a href="${doc.fileData}" download="${name}" class="btn btn-ghost btn-sm" aria-label="Download ${name}">
                   <i class="ph-bold ph-download-simple" aria-hidden="true"></i>Download</a>`
            : `<span class="badge badge-warn">File unavailable</span>`;

        const remove = doc.type === 'OWNER'
            ? `<button type="button" class="btn btn-danger-ghost btn-sm btn-icon" data-delete="1" aria-label="Delete ${name}" title="Delete">
                   <i class="ph-bold ph-trash" aria-hidden="true"></i></button>`
            : '';

        card.innerHTML = `
            <div class="doc-top">
                <div class="doc-tile" data-cat="${cat}"><i class="ph-bold ph-${icon}" aria-hidden="true"></i></div>
                <div>
                    <h2 class="doc-title">${name}</h2>
                    <p class="doc-meta">${escapeHtml(doc.category || 'Document')} &middot; ${formatDay(doc.createdAt)}</p>
                </div>
            </div>
            <div class="doc-foot">
                <span class="badge ${access.cls}"><i class="ph-bold ph-${access.icon}" aria-hidden="true"></i>${access.label}</span>
                <div class="doc-actions">${download}${remove}</div>
            </div>`;

        const del = card.querySelector('[data-delete]');
        if (del) del.addEventListener('click', () => window.deleteDoc(doc.id));
        docGrid.appendChild(card);
    });
}

// Keep the search and category in the URL so a filtered view can be bookmarked or shared.
function syncUrl(query, cat) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (cat !== 'all') params.set('category', cat);
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function filterDocs() {
    const query = searchBar.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    syncUrl(searchBar.value.trim(), cat);
    const filtered = allDocs.filter(doc =>
        String(doc.fileName || '').toLowerCase().includes(query) && (cat === 'all' || doc.category === cat));
    renderDocs(filtered, Boolean(query) || cat !== 'all');
}

// Restore filters from the URL
(() => {
    const params = new URLSearchParams(location.search);
    if (searchBar && params.get('q')) searchBar.value = params.get('q');
    if (categoryFilter && ['Identity', 'Education', 'Health'].includes(params.get('category'))) categoryFilter.value = params.get('category');
})();

if (searchBar) searchBar.addEventListener('input', filterDocs);
if (categoryFilter) categoryFilter.addEventListener('change', filterDocs);

window.deleteDoc = async (docId) => {
    const doc = allDocs.find(d => d.id === docId);
    const ok = await confirmDialog({
        title: 'Delete this document?',
        message: `${doc ? `"${doc.fileName}" will be` : 'It will be'} removed from your vault and from anyone it was shared with. This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
    });
    if (!ok) return;
    try {
        await db.collection('documents').doc(docId).delete();
        if (window.Logger) await Logger.log('DELETE', `Deleted '${doc ? doc.fileName : docId}'`);
        allDocs = allDocs.filter(d => d.id !== docId);
        updateCount();
        filterDocs();
        toast('Document deleted.');
    } catch (e) {
        console.error(e);
        toast('Delete failed. Please try again.', 'error');
    }
};
