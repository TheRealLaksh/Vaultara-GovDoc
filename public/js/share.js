checkAuth();

const docSelect = document.getElementById('docSelect');
const shareForm = document.getElementById('shareForm');
const statusDiv = document.getElementById('shareStatus');

// 1. Load User's Documents into Dropdown
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

// 2. Handle Sharing Logic
shareForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const docId = docSelect.value;
    const receiverPhone = document.getElementById('receiverPhone').value.trim();
    
    if(!docId) {
        alert("Please select a document.");
        return;
    }
    
    // Basic validation
    if(receiverPhone.length < 10) {
        alert("Please enter a valid 10-digit phone number.");
        return;
    }

    statusDiv.textContent = "Processing...";
    statusDiv.style.color = "blue";

    try {
        // Update the document to include this phone number in 'sharedWith' array
        await db.collection('documents').doc(docId).update({
            sharedWith: firebase.firestore.FieldValue.arrayUnion(receiverPhone)
        });

        // Log the action
        if(window.Logger) {
            const docName = docSelect.options[docSelect.selectedIndex].text;
            await Logger.log("SHARE", `Shared '${docName}' with ${receiverPhone}`);
        }

        statusDiv.textContent = "✅ Document Shared Successfully!";
        statusDiv.style.color = "green";
        
        // Reset form
        setTimeout(() => {
            statusDiv.textContent = "";
            document.getElementById('receiverPhone').value = "";
            docSelect.value = "";
        }, 2000);

    } catch (error) {
        console.error(error);
        statusDiv.textContent = "Error: " + error.message;
        statusDiv.style.color = "red";
    }
});