// GHOST MODE: Looks like Phone Auth, acts like Email Auth (Free Tier Compatible)
const GHOST_PASSWORD = "GovDocs_Secret_Password_2025!";
const GHOST_DOMAIN = "@govdocs.test";

// Step 1: "Send" OTP (Simulation)
function sendOTP() {
    const phoneNumber = document.getElementById('phoneNumber').value;
    
    if(!phoneNumber || phoneNumber.length < 10) {
        alert("Please enter a valid phone number");
        return;
    }

    const btn = document.querySelector('#step1 button');
    const originalText = btn.innerText;
    btn.innerText = "Sending...";
    btn.disabled = true;

    console.log(`[SIMULATION] Pretending to send OTP to ${phoneNumber}...`);

    setTimeout(() => {
        document.getElementById('step1').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');
        btn.innerText = originalText;
        btn.disabled = false;
        alert("OTP Sent! (Use 123456)");
    }, 1500);
}

// Step 2: Verify OTP & Login
async function verifyOTP() {
    const enteredOtp = document.getElementById('otpCode').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    
    // Create a status element to show what's happening
    let statusDiv = document.getElementById('otpStatus');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'otpStatus';
        statusDiv.style.marginTop = "10px";
        statusDiv.style.fontWeight = "bold";
        document.getElementById('step2').appendChild(statusDiv);
    }

    // 1. Verify the "Fake" OTP
    if(enteredOtp !== "123456") {
        alert("Invalid OTP! (Hint: Use 123456)");
        return;
    }

    statusDiv.style.color = "blue";
    statusDiv.innerText = "Verifying & Logging in...";

    // 2. Construct the Ghost Email
    const ghostEmail = phoneNumber.replace(/[^0-9]/g, '') + GHOST_DOMAIN;

    try {
        // 3. Attempt to Login
        await auth.signInWithEmailAndPassword(ghostEmail, GHOST_PASSWORD);
        handleSuccess();

    } catch (error) {
        console.log("Login failed, checking if registration is needed...", error.code);

        // 4. CATCH THE ERROR SHOWN IN YOUR SCREENSHOT
        if(error.code === 'auth/invalid-login-credentials' || 
           error.code === 'auth/user-not-found' || 
           error.code === 'auth/invalid-credential') {
            
            try {
                statusDiv.style.color = "green";
                statusDiv.innerText = "First time user? Creating Account...";
                
                // REGISTER the new user automatically
                await auth.createUserWithEmailAndPassword(ghostEmail, GHOST_PASSWORD);
                handleSuccess();
                
            } catch (createError) {
                console.error(createError);
                statusDiv.style.color = "red";
                statusDiv.innerText = "Registration Failed: " + createError.message;
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
        // Log it as a "Phone" login to keep the illusion
        Logger.log("LOGIN", "User logged in via Phone OTP").then(() => {
            window.location.href = "dashboard.html";
        });
    } else {
        window.location.href = "dashboard.html";
    }
}