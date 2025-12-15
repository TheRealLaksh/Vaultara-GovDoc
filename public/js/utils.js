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