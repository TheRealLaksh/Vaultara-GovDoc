checkAuth();

const profilePhone = document.getElementById('profilePhone');
const nameInput = document.getElementById('fullName');
const profileForm = document.getElementById('profileForm');

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // 1. Display Phone Number (Extract from Ghost Email)
        // Email is like "9999999999@govdocs.test" -> We show "9999999999"
        const phone = user.email.split('@')[0];
        profilePhone.innerText = `+91 ${phone}`;

        // 2. Fetch existing profile data from Firestore (if any)
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                if(data.name) nameInput.value = data.name;
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    }
});

// 3. Save Profile Logic
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const name = nameInput.value;

    if (!user) return;

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        // Save/Update user document
        await db.collection('users').doc(user.uid).set({
            name: name,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            aadhaarLinked: true // Simulation
        }, { merge: true });

        alert("Profile Updated Successfully!");
    } catch (error) {
        console.error(error);
        alert("Error updating profile: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});