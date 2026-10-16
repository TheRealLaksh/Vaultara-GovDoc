checkAuth();

const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const fileNameEl = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_BYTES = 500 * 1024;

// Show the chosen file inside the drop area
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileNameEl.textContent = file ? `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)` : '';
    fileNameEl.classList.toggle('hidden', !file);
    setStatus(uploadStatus, '');
    // Suggest a title from the file name when the title is still empty
    const title = document.getElementById('docTitle');
    if (file && !title.value) title.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
});
['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, () => dropzone.classList.add('is-over')));
['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, () => dropzone.classList.remove('is-over')));

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const title = document.getElementById('docTitle').value.trim();
    const category = document.getElementById('docCategory').value;
    const file = fileInput.files[0];

    if (!file) { setStatus(uploadStatus, 'Choose a file to upload.', 'error'); return; }
    if (!ALLOWED_TYPES.includes(file.type)) {
        setStatus(uploadStatus, 'Only PDF, JPEG or PNG files are allowed.', 'error');
        return;
    }
    if (!title || title.length > 120) {
        setStatus(uploadStatus, 'Give the document a title of 1 to 120 characters.', 'error');
        return;
    }
    if (file.size > MAX_BYTES) {
        setStatus(uploadStatus, 'That file is over 500 KB. Compress it or choose a smaller one.', 'error');
        return;
    }

    setStatus(uploadStatus, 'Uploading…', 'info');
    uploadBtn.disabled = true;

    const reader = new FileReader();

    reader.onload = async function(event) {
        const base64String = event.target.result;

        try {
            // 1. Fetch User Profile to get Family ID
            let myFamilyId = null;
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().familyId) {
                myFamilyId = userDoc.data().familyId;
            }

            // 2. Save Document with Family ID tag
            await db.collection('documents').add({
                ownerId: user.uid,
                familyId: myFamilyId,
                fileName: title,
                category: category,
                fileType: file.type,
                fileData: base64String,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (window.Logger) {
                await Logger.log('UPLOAD', `Uploaded ${title} (${category})`);
            }

            setStatus(uploadStatus, 'Uploaded. Taking you back to your vault.', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1200);

        } catch (error) {
            console.error(error);
            setStatus(uploadStatus, 'Upload failed. Check your connection and try again.', 'error');
            uploadBtn.disabled = false;
        }
    };

    reader.onerror = function(error) {
        console.error('File reading failed', error);
        setStatus(uploadStatus, 'Could not read that file. Try another one.', 'error');
        uploadBtn.disabled = false;
    };

    reader.readAsDataURL(file);
});
