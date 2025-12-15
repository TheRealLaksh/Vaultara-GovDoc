checkAuth();

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const title = document.getElementById('docTitle').value;
    const category = document.getElementById('docCategory').value;
    const file = document.getElementById('fileInput').files[0];
    const statusDiv = document.getElementById('uploadStatus');

    if (!file) return;

    if (file.size > 500 * 1024) {
        alert("⚠️ File too large! Please upload files smaller than 500KB.");
        statusDiv.textContent = "Error: File exceeds 500KB limit.";
        statusDiv.style.color = "red";
        return;
    }

    statusDiv.textContent = "Encrypting & Processing...";

    const reader = new FileReader();
    
    reader.onload = async function(event) {
        const base64String = event.target.result;

        try {
            // 1. Fetch User Profile to get Family ID
            let myFamilyId = null;
            const userDoc = await db.collection('users').doc(user.uid).get();
            if(userDoc.exists && userDoc.data().familyId) {
                myFamilyId = userDoc.data().familyId;
            }

            // 2. Save Document with Family ID tag
            await db.collection('documents').add({
                ownerId: user.uid,
                familyId: myFamilyId, // <--- New Field for Linking
                fileName: title,
                category: category,
                fileType: file.type,
                fileData: base64String,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if(window.Logger) {
                await Logger.log("UPLOAD", `Uploaded ${title} (${category})`);
            }

            statusDiv.textContent = "Upload Successful! Redirecting...";
            setTimeout(() => window.location.href = 'dashboard.html', 1500);

        } catch (error) {
            console.error(error);
            statusDiv.textContent = "Error: " + error.message;
            statusDiv.style.color = "red";
        }
    };

    reader.onerror = function(error) {
        console.error("File reading failed", error);
        statusDiv.textContent = "Error reading file.";
    };

    reader.readAsDataURL(file);
});