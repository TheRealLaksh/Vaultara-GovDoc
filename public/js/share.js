checkAuth();

const docSelect = document.getElementById('docSelect');
const shareForm = document.getElementById('shareForm');
const statusDiv = document.getElementById('shareStatus');

// Standardize Phone Helper
function sanitizePhone(phone) {
    let digits = phone.replace(/\D/g, ''); 
    if (digits.length > 10) digits = digits.slice(-10);
    return digits;
}

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
    const rawReceiver = document.getElementById('receiverPhone').value;
    const cleanReceiver = sanitizePhone(rawReceiver);
    
    if(!docId) {
        alert("Please select a document.");
        return;
    }
    
    if(cleanReceiver.length !== 10) {
        alert("Please enter a valid 10-digit phone number.");
        return;
    }

    // Prevent sharing with self
    const currentUserPhone = auth.currentUser.email.split('@')[0];
    if(cleanReceiver === currentUserPhone) {
        alert("You cannot share with yourself.");
        return;
    }

    statusDiv.textContent = "Processing...";
    statusDiv.style.color = "blue";

    try {
        await db.collection('documents').doc(docId).update({
            sharedWith: firebase.firestore.FieldValue.arrayUnion(cleanReceiver)
        });

        if(window.Logger) {
            const docName = docSelect.options[docSelect.selectedIndex].text;
            await Logger.log("SHARE", `Shared '${docName}' with ${cleanReceiver}`);
        }

        statusDiv.textContent = "✅ Shared Successfully with " + cleanReceiver;
        statusDiv.style.color = "green";
        
        setTimeout(() => {
            statusDiv.textContent = "";
            document.getElementById('receiverPhone').value = "";
            docSelect.value = "";
        }, 2500);

    } catch (error) {
        console.error(error);
        statusDiv.textContent = "Error: " + error.message;
        statusDiv.style.color = "red";
    }
});