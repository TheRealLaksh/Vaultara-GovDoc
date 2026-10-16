checkAuth();
const logList = document.getElementById('logList');

const ACTION_LABELS = {
    LOGIN: 'Signed in',
    LOGOUT: 'Signed out',
    REGISTER: 'Account created',
    UPLOAD: 'Upload',
    SHARE: 'Share',
    DELETE: 'Delete',
    PROFILE_UPDATE: 'Profile',
};

function showMessage(icon, title, body) {
    logList.innerHTML = `
        <li class="empty" style="border:none;">
            <i class="ph-bold ph-${icon}" aria-hidden="true"></i>
            <h2>${title}</h2>
            <p>${body}</p>
        </li>`;
}

auth.onAuthStateChanged(user => {
    if (!user || !logList) return;

    db.collection('logs')
        .where('userId', '==', user.uid)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get()
        .then(snapshot => {
            logList.innerHTML = '';
            logList.setAttribute('aria-busy', 'false');

            if (snapshot.empty) {
                showMessage('clock-counter-clockwise', 'Nothing here yet', 'Sign-ins, uploads, shares and deletions will appear here as you use Vaultara.');
                return;
            }

            snapshot.forEach((doc, index) => {
                const data = doc.data();
                const row = document.createElement('li');
                row.className = 'log-row reveal';
                row.style.animationDelay = `${Math.min(index, 10) * 40}ms`;
                row.innerHTML = `
                    <span class="log-time">${escapeHtml(formatDate(data.timestamp))}</span>
                    <span class="badge log-badge" data-action="${escapeHtml(data.action)}">${escapeHtml(ACTION_LABELS[data.action] || data.action)}</span>
                    <span class="log-detail">${escapeHtml(data.description)}</span>`;
                logList.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading activity:', error);
            showMessage('warning-circle', 'We could not load your activity', 'Refresh the page. If it keeps happening, the activity index may still be building.');
        });
});
