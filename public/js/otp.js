// AUTH HANDLER (Replaces previous OTP Logic)

function toggleMode() {
    document.getElementById('loginActions').classList.toggle('hidden');
    document.getElementById('registerActions').classList.toggle('hidden');
    document.getElementById('authError').innerText = "";
}

async function handleAuth(mode) {
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('authError');
    
    errorDiv.innerText = "";

    if (!email || !password) {
        errorDiv.innerText = "Please enter both email and password.";
        return;
    }

    if (mode === 'register' && (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
        errorDiv.innerText = "Password must be at least 8 characters and include a letter and a number.";
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
            // Sharing and family access only work for verified emails, so send the link straight away.
            try { await user.sendEmailVerification(); } catch (e) { console.warn("Verification email not sent", e); }
        }
        
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error(error);
        let msg = error.message;
        
        // Friendly Error Messages
        // With email-enumeration protection on, Firebase reports both cases as invalid-credential.
        if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential'].includes(error.code)) msg = "Incorrect email or password.";
        if (error.code === 'auth/too-many-requests') msg = "Too many attempts. Please wait a few minutes and try again.";
        if (error.code === 'auth/weak-password') msg = "Password is too weak. Use 8+ characters with a letter and a number.";
        if (error.code === 'auth/email-already-in-use') msg = "Email already registered. Try logging in.";
        if (error.code === 'auth/invalid-email') msg = "Invalid email address format.";
        
        errorDiv.innerText = msg;
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}