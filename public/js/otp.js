// AUTH HANDLER (Replaces previous OTP Logic)

function toggleMode() {
    document.getElementById('loginActions').classList.toggle('hidden');
    document.getElementById('registerActions').classList.toggle('hidden');
    document.getElementById('authError').innerText = "";
}

async function handleAuth(mode) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('authError');
    
    errorDiv.innerText = "";

    if (!email || !password) {
        errorDiv.innerText = "Please enter both email and password.";
        return;
    }

    if (password.length < 6) {
        errorDiv.innerText = "Password must be at least 6 characters.";
        return;
    }

    // UI Loading State
    const btn = mode === 'login' 
        ? document.querySelector('#loginActions button') 
        : document.querySelector('#registerActions button');
    
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<span style="color:white;">Processing...</span>`;
    btn.disabled = true;

    try {
        if (mode === 'login') {
            await auth.signInWithEmailAndPassword(email, password);
            if(window.Logger) await Logger.log("LOGIN", "User logged in securely");
        } else {
            await auth.createUserWithEmailAndPassword(email, password);
            // Create initial user profile doc
            const user = auth.currentUser;
            await db.collection('users').doc(user.uid).set({
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                aadhaarLinked: false
            });
            if(window.Logger) await Logger.log("REGISTER", "New user account created");
        }
        
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error(error);
        let msg = error.message;
        
        // Friendly Error Messages
        if (error.code === 'auth/wrong-password') msg = "Incorrect password.";
        if (error.code === 'auth/user-not-found') msg = "No account found with this email.";
        if (error.code === 'auth/email-already-in-use') msg = "Email already registered. Try logging in.";
        if (error.code === 'auth/invalid-email') msg = "Invalid email address format.";
        
        errorDiv.innerText = msg;
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}