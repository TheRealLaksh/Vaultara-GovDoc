checkAuth();

const profilePhone = document.getElementById('profilePhone');
const verifyBadge = document.getElementById('verifyBadge');
const nameInput = document.getElementById('fullName');
const familyIdInput = document.getElementById('familyId');
const profileForm = document.getElementById('profileForm');

window.generateRandomId = () => {
    const randomCode = 'FAM-' + Math.floor(1000 + Math.random() * 9000);
    if(familyIdInput) familyIdInput.value = randomCode;
};

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // 1. Display Email
        if(profilePhone) profilePhone.innerText = user.email;

        // 2. Update Verification Badge
        if(verifyBadge) {
            if(user.emailVerified) {
                verifyBadge.innerText = "Verified Citizen";
                verifyBadge.style.backgroundColor = "#dcfce7";
                verifyBadge.style.color = "#166534";
            } else {
                verifyBadge.innerText = "Unverified";
                verifyBadge.style.backgroundColor = "#fef3c7";
                verifyBadge.style.color = "#b45309";
                
                // Make it clickable to resend
                verifyBadge.style.cursor = "pointer";
                verifyBadge.title = "Click to send verification email";
                verifyBadge.onclick = async () => {
                    await user.sendEmailVerification();
                    alert("Verification link sent!");
                };
            }
        }

        // 3. Fetch existing profile data
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (doc.exists) {
                const data = doc.data();
                if(data.name && nameInput) nameInput.value = data.name;
                
                if(data.familyId && familyIdInput) {
                    familyIdInput.value = data.familyId;
                }
            } 
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    }
});

if(profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const name = nameInput.value;
        const familyId = familyIdInput.value.toUpperCase().trim();

        if (!user) return;

        const btn = e.target.querySelector('button');
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<span style="color:white;">Saving...</span>`;
        btn.disabled = true;

        try {
            await db.collection('users').doc(user.uid).set({
                name: name,
                familyId: familyId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            if(window.Logger) {
                await Logger.log("PROFILE_UPDATE", `Updated profile. Family ID: ${familyId || 'None'}`);
            }

            alert("Profile Updated!");
        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    });
}