checkAuth();

const profilePhone = document.getElementById('profilePhone');
const nameInput = document.getElementById('fullName');
const familyIdInput = document.getElementById('familyId');
const profileForm = document.getElementById('profileForm');

// Helper to generate a random Family ID
const generateFamilyId = () => {
    return 'FAM-' + Math.floor(1000 + Math.random() * 9000);
};

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // 1. Display Phone Number
        const phone = user.email.split('@')[0];
        profilePhone.innerText = `+91 ${phone}`;

        // 2. Fetch existing profile data
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (doc.exists) {
                const data = doc.data();
                if(data.name) nameInput.value = data.name;
                
                // If Family ID exists, show it. If not, generate a new one to show.
                if(data.familyId) {
                    familyIdInput.value = data.familyId;
                } else {
                    familyIdInput.value = generateFamilyId();
                }
            } else {
                // New user: Pre-fill a new Family ID
                familyIdInput.value = generateFamilyId();
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            familyIdInput.value = generateFamilyId(); // Fallback
        }
    }
});

// 3. Save Profile Logic
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const name = nameInput.value;
    const familyId = familyIdInput.value;

    if (!user) return;

    const btn = e.target.querySelector('button');
    // Save the internal HTML to restore later (handles the Reveal animation structure)
    const originalContent = btn.innerHTML; 
    
    // Switch to loading state
    btn.innerHTML = `<span style="color:white;">Saving...</span>`;
    btn.disabled = true;

    try {
        // Save/Update user document with Name AND Family ID
        await db.collection('users').doc(user.uid).set({
            name: name,
            familyId: familyId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            aadhaarLinked: true 
        }, { merge: true });

        // Log the action
        if(window.Logger) {
            await Logger.log("PROFILE_UPDATE", "Updated profile details");
        }

        alert("Profile Updated Successfully!");
    } catch (error) {
        console.error(error);
        alert("Error updating profile: " + error.message);
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
});