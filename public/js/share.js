checkAuth();

const docSelect = document.getElementById('docSelect');
const shareForm = document.getElementById('shareForm');
const statusDiv = document.getElementById('shareStatus');
const shareBtn = document.getElementById('shareBtn');
const shareNote = document.getElementById('shareNote');

// 1. Load Documents
auth.onAuthStateChanged(user => {
    if (!user) return;

    if (!user.emailVerified && shareNote) {
        shareNote.classList.remove('hidden');
    }

    db.collection('documents')
        .where('ownerId', '==', user.uid)
        .get()
        .then(snapshot => {
            docSelect.innerHTML = '';
            if (snapshot.empty) {
                const none = document.createElement('option');
                none.value = '';
                none.textContent = 'You have no documents yet';
                docSelect.appendChild(none);
                docSelect.disabled = true;
                shareBtn.disabled = true;
                return;
            }
            const first = document.createElement('option');
            first.value = '';
            first.textContent = 'Choose a document';
            docSelect.appendChild(first);
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().fileName;
                docSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error(error);
            docSelect.innerHTML = '<option value="">Could not load your documents</option>';
            setStatus(statusDiv, 'We could not load your documents. Refresh and try again.', 'error');
        });
});

// 2. Share Logic
shareForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(statusDiv, '');

    const docId = docSelect.value;
    const rawReceiver = document.getElementById('receiverEmail').value.trim().toLowerCase(); // lowercase so it matches the auth email

    if (!docId) {
        setStatus(statusDiv, 'Choose a document to share.', 'error');
        return;
    }

    // Basic Email Validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawReceiver) || rawReceiver.length > 254) {
        setStatus(statusDiv, 'Enter a valid email address.', 'error');
        return;
    }

    // Prevent sharing with self
    const currentUserEmail = auth.currentUser.email;
    if (rawReceiver === currentUserEmail.toLowerCase()) {
        setStatus(statusDiv, 'You cannot share a document with yourself.', 'error');
        return;
    }

    setStatus(statusDiv, 'Sharing…', 'info');
    shareBtn.disabled = true;

    try {
        await db.collection('documents').doc(docId).update({
            sharedWith: firebase.firestore.FieldValue.arrayUnion(rawReceiver)
        });

        if (window.Logger) {
            const docName = docSelect.options[docSelect.selectedIndex].text;
            await Logger.log('SHARE', `Shared '${docName}' with ${rawReceiver}`);
        }

        setStatus(statusDiv, `Shared with ${rawReceiver}. They can open it once their email is verified.`, 'success');
        document.getElementById('receiverEmail').value = '';
        docSelect.value = '';
    } catch (error) {
        console.error(error);
        setStatus(statusDiv, 'Could not share the document. Please try again.', 'error');
    } finally {
        shareBtn.disabled = false;
    }
});
