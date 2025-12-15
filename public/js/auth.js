function logout() {
    const user = auth.currentUser;
    if(user) {
        // Log before signing out
        db.collection('logs').add({
            userId: user.uid,
            action: "LOGOUT",
            description: "User logged out manually",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            auth.signOut().then(() => {
                window.location.href = "index.html";
            });
        });
    }
}

auth.onAuthStateChanged(user => {
    const navLinks = document.getElementById('navLinks');
    // Only update nav on index page if element exists
    if (navLinks) {
        if (user) {
            navLinks.innerHTML = `<li><a href="dashboard.html" class="btn">Go to Dashboard</a></li>`;
        } else {
            navLinks.innerHTML = `<li><a href="login.html">Login</a></li>
                                  <li><a href="register.html" class="btn btn-secondary">Register</a></li>`;
        }
    }
});