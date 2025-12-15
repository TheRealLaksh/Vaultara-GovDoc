checkAuth();

const profilePhone = document.getElementById('profilePhone');
const nameInput = document.getElementById('fullName');
const familyIdInput = document.getElementById('familyId');
const profileForm = document.getElementById('profileForm');

// Make this available to the HTML button
window.generateRandomId = () => {
    const randomCode = 'FAM-' + Math.floor(1000 + Math.random() * 9000);
    if(familyIdInput) familyIdInput.value = randomCode;
};

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // 1. Display Phone Number
        const phone = user.email.split('@')[0];
        if(profilePhone) profilePhone.innerText = `+91 ${phone}`;

        // 2. Fetch existing profile data
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (doc.exists) {
                const data = doc.data();
                if(data.name && nameInput) nameInput.value = data.name;
                
                // If Family ID exists, show it.
                if(data.familyId && familyIdInput) {
                    familyIdInput.value = data.familyId;
                }
            } 
            // If no ID exists, we leave it blank so they can TYPE one to join, 
            // or click "Generate" to create.
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    }
});

// 3. Save Profile Logic
if(profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const name = nameInput.value;
        const familyId = familyIdInput.value.toUpperCase().trim(); // Clean the ID

        if (!user) return;

        const btn = e.target.querySelector('button');
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<span style="color:white;">Saving...</span>`;
        btn.disabled = true;

        try {
            // Save Profile
            await db.collection('users').doc(user.uid).set({
                name: name,
                familyId: familyId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                aadhaarLinked: true 
            }, { merge: true });

            if(window.Logger) {
                await Logger.log("PROFILE_UPDATE", `Updated profile. Family ID: ${familyId || 'None'}`);
            }

            alert("Profile Updated! You are now linked to Family ID: " + (familyId || "None"));
        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    });
}