checkAuth();

const profileEmail = document.getElementById('profileEmail');
const verifyBadge = document.getElementById('verifyBadge');
const resendVerify = document.getElementById('resendVerify');
const nameInput = document.getElementById('fullName');
const familyIdInput = document.getElementById('familyId');
const profileForm = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');
const generateBtn = document.getElementById('generateFamily');
const copyBtn = document.getElementById('copyFamily');

window.generateRandomId = () => {
    if (familyIdInput) familyIdInput.value = generateFamilyId();
};
if (generateBtn) generateBtn.addEventListener('click', window.generateRandomId);

if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
        const id = familyIdInput.value.trim();
        if (!id) { toast('Nothing to copy yet. Generate a Family ID first.', 'error'); return; }
        try {
            await navigator.clipboard.writeText(id);
            toast('Family ID copied.');
        } catch (e) {
            familyIdInput.select();
            toast('Press Ctrl+C to copy the selected ID.', 'info');
        }
    });
}

auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    // 1. Display email
    if (profileEmail) profileEmail.textContent = user.email;

    // 2. Verification badge
    if (verifyBadge) {
        if (user.emailVerified) {
            verifyBadge.className = 'badge badge-ok';
            verifyBadge.innerHTML = '<i class="ph-bold ph-seal-check" aria-hidden="true"></i>Email verified';
            if (resendVerify) resendVerify.classList.add('hidden');
        } else {
            verifyBadge.className = 'badge badge-warn';
            verifyBadge.innerHTML = '<i class="ph-bold ph-warning" aria-hidden="true"></i>Email not verified';
            if (resendVerify) {
                resendVerify.classList.remove('hidden');
                resendVerify.onclick = async () => {
                    try {
                        await user.sendEmailVerification();
                        toast('Verification link sent. Check your inbox and spam folder.');
                    } catch (e) {
                        console.error(e);
                        toast('Could not send the link. Please try again in a minute.', 'error');
                    }
                };
            }
        }
    }

    // 3. Fetch existing profile data
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.name && nameInput) nameInput.value = data.name;
            if (data.familyId && familyIdInput) {
                familyIdInput.value = data.familyId;
                if (!isValidFamilyId(data.familyId)) {
                    setStatus(profileStatus,
                        'Your Family ID uses the old short format, which no longer gives access. Generate a new one and share it with your family.',
                        'info');
                }
            }
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        setStatus(profileStatus, 'We could not load your profile. Refresh and try again.', 'error');
    }
});

if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const name = nameInput.value.trim();
        const familyId = familyIdInput.value.toUpperCase().trim();

        if (!user) return;
        setStatus(profileStatus, '');

        if (familyId && !isValidFamilyId(familyId)) {
            setStatus(profileStatus, 'A Family ID looks like FAM-XXXXXXXXXXXXXXXX (12 to 32 letters and numbers). Use Generate to create one.', 'error');
            return;
        }
        if (name.length > 100) {
            setStatus(profileStatus, 'That name is too long.', 'error');
            return;
        }

        const btn = document.getElementById('saveProfile');
        btn.disabled = true;

        try {
            await db.collection('users').doc(user.uid).set({
                name: name,
                familyId: familyId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            if (window.Logger) {
                await Logger.log('PROFILE_UPDATE', `Updated profile. Family ID: ${familyId || 'None'}`);
            }

            familyIdInput.value = familyId;
            toast('Profile saved.');
        } catch (error) {
            console.error(error);
            setStatus(profileStatus, 'Could not save your profile. Please try again.', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}
