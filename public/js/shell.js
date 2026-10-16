// Builds the signed-in app navigation (sidebar on desktop, bottom bar on phones)
// so every page shares one definition. Needs auth.js (logout) and firebase-config.js (auth).

(() => {
    const NAV = [
        { href: 'dashboard.html', label: 'Vault', icon: 'folder-open' },
        { href: 'upload.html', label: 'Upload', icon: 'upload-simple' },
        { href: 'share.html', label: 'Share', icon: 'share-network' },
        { href: 'activity.html', label: 'Activity', icon: 'clock-counter-clockwise' },
        { href: 'profile.html', label: 'Profile', icon: 'user-circle' },
    ];

    const here = location.pathname.split('/').pop() || 'index.html';
    const link = (item, cls) =>
        `<a href="${item.href}" class="${cls}"${item.href === here ? ' aria-current="page"' : ''}>` +
        `<i class="ph-bold ph-${item.icon}" aria-hidden="true"></i><span>${item.label}</span></a>`;

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.innerHTML = `
            <div>
                <a href="dashboard.html" class="brand" aria-label="Vaultara home" translate="no">
                    <span class="brand-mark"><i class="ph-bold ph-vault" aria-hidden="true"></i></span>Vaultara
                </a>
                <nav class="nav" aria-label="Main">${NAV.map((n) => link(n, 'nav-link')).join('')}</nav>
            </div>
            <div class="sidebar-foot">
                <div class="sidebar-user" id="sidebarUser" title=""></div>
                <button type="button" class="btn btn-ghost" id="signOutBtn" style="justify-content:flex-start;">
                    <i class="ph-bold ph-sign-out" aria-hidden="true"></i>Sign out
                </button>
            </div>`;
        document.getElementById('signOutBtn').addEventListener('click', () => window.logout && window.logout());
    }

    const mobile = document.getElementById('mobileNav');
    if (mobile) {
        mobile.setAttribute('aria-label', 'Main');
        mobile.innerHTML = NAV.map((n) => link(n, '')).join('');
    }

    // `auth` is a top-level const from firebase-config.js, so it is not a window property.
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged((user) => {
            const slot = document.getElementById('sidebarUser');
            if (slot && user) { slot.textContent = user.email || ''; slot.title = user.email || ''; }
        });
    }
})();
