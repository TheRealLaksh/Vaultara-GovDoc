checkAuth();

const docSelect = document.getElementById('docSelect');
const shareForm = document.getElementById('shareForm');
const statusDiv = document.getElementById('shareStatus');

// 1. Load Documents
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('documents')
            .where('ownerId', '==', user.uid)
            .get()
            .then(snapshot => {
                docSelect.innerHTML = '<option value="">-- Select a Document --</option>';
                if (snapshot.empty) {
                    docSelect.innerHTML = '<option>No documents found</option>';
                    return;
                }
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = data.fileName;
                    docSelect.appendChild(option);
                });
            });
    }
});

// 2. Share Logic
shareForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const docId = docSelect.value;
    const rawReceiver = document.getElementById('receiverEmail').value.trim(); // Changed ID
    
    if(!docId) {
        alert("Please select a document.");
        return;
    }
    
    // Basic Email Validation
    if(!rawReceiver.includes('@') || !rawReceiver.includes('.')) {
        alert("Please enter a valid email address.");
        return;
    }

    // Prevent sharing with self
    const currentUserEmail = auth.currentUser.email;
    if(rawReceiver.toLowerCase() === currentUserEmail.toLowerCase()) {
        alert("You cannot share with yourself.");
        return;
    }

    statusDiv.textContent = "Processing...";
    statusDiv.style.color = "blue";

    try {
        await db.collection('documents').doc(docId).update({
            sharedWith: firebase.firestore.FieldValue.arrayUnion(rawReceiver)
        });

        if(window.Logger) {
            const docName = docSelect.options[docSelect.selectedIndex].text;
            await Logger.log("SHARE", `Shared '${docName}' with ${rawReceiver}`);
        }

        statusDiv.textContent = "✅ Shared Successfully with " + rawReceiver;
        statusDiv.style.color = "green";
        
        setTimeout(() => {
            statusDiv.textContent = "";
            document.getElementById('receiverEmail').value = "";
            docSelect.value = "";
        }, 2500);

    } catch (error) {
        console.error(error);
        statusDiv.textContent = "Error: " + error.message;
        statusDiv.style.color = "red";
    }
});