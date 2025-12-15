// GHOST MODE: Looks like Phone Auth, acts like Email Auth
const GHOST_PASSWORD = "GovDocs_Secret_Password_2025!";
const GHOST_DOMAIN = "@govdocs.test";

// HELPER: Standardize Phone to last 10 digits
function sanitizePhone(phone) {
    let digits = phone.replace(/\D/g, ''); // Remove non-digits
    if (digits.length > 10) {
        digits = digits.slice(-10); // Take last 10 (removes 91 or 0)
    }
    return digits;
}

function sendOTP() {
    const rawPhone = document.getElementById('phoneNumber').value;
    const cleanPhone = sanitizePhone(rawPhone);

    if (cleanPhone.length !== 10) {
        alert("Please enter a valid 10-digit phone number.");
        return;
    }

    // Store the cleaned number for step 2
    window.tempPhone = cleanPhone;

    const btn = document.querySelector('#step1 button');
    const originalText = btn.innerText;
    btn.innerText = "Sending...";
    btn.disabled = true;

    console.log(`[SIMULATION] Sending OTP to ${cleanPhone}...`);

    setTimeout(() => {
        document.getElementById('step1').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');
        btn.innerText = originalText;
        btn.disabled = false;
        alert("OTP Sent! (Use 123456)");
    }, 1500);
}

async function verifyOTP() {
    const enteredOtp = document.getElementById('otpCode').value;
    // Use the sanitized phone from Step 1
    const cleanPhone = window.tempPhone || sanitizePhone(document.getElementById('phoneNumber').value);
    
    let statusDiv = document.getElementById('otpStatus');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'otpStatus';
        statusDiv.style.marginTop = "10px";
        statusDiv.style.fontWeight = "bold";
        document.getElementById('step2').appendChild(statusDiv);
    }

    if(enteredOtp !== "123456") {
        alert("Invalid OTP! (Hint: Use 123456)");
        return;
    }

    statusDiv.style.color = "blue";
    statusDiv.innerText = "Verifying...";

    // Construct Email with CLEAN 10-digit phone
    const ghostEmail = cleanPhone + GHOST_DOMAIN;

    try {
        await auth.signInWithEmailAndPassword(ghostEmail, GHOST_PASSWORD);
        handleSuccess();
    } catch (error) {
        console.log("Login failed, trying registration...", error.code);

        if(error.code === 'auth/invalid-login-credentials' || 
           error.code === 'auth/user-not-found' || 
           error.code === 'auth/invalid-credential') {
            try {
                statusDiv.style.color = "green";
                statusDiv.innerText = "Creating New Account...";
                await auth.createUserWithEmailAndPassword(ghostEmail, GHOST_PASSWORD);
                handleSuccess();
            } catch (createError) {
                console.error(createError);
                statusDiv.style.color = "red";
                statusDiv.innerText = "Error: " + createError.message;
            }
        } else {
            console.error(error);
            statusDiv.style.color = "red";
            statusDiv.innerText = "Error: " + error.message;
        }
    }
}

function handleSuccess() {
    if(window.Logger) {
        Logger.log("LOGIN", "User logged in").then(() => {
            window.location.href = "dashboard.html";
        });
    } else {
        window.location.href = "dashboard.html";
    }
}