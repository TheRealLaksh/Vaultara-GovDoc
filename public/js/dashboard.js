checkAuth();

const docGrid = document.getElementById('docGrid');
const loader = document.getElementById('docLoader');
const searchBar = document.getElementById('searchBar');
const categoryFilter = document.getElementById('categoryFilter');

let allDocs = [];

// Fetch Docs
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('documents')
            .where('ownerId', '==', user.uid)
            .onSnapshot(snapshot => {
                allDocs = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
                renderDocs(allDocs);
                if(loader) loader.classList.add('hidden');
            });
    }
});

function renderDocs(docs) {
    if(!docGrid) return;
    docGrid.innerHTML = '';
    
    if (docs.length === 0) {
        docGrid.innerHTML = '<p>No documents found. Upload one!</p>';
        return;
    }

    docs.forEach(doc => {
        // Create a downloadable link from the Base64 data
        const div = document.createElement('div');
        div.className = 'card';
        
        div.innerHTML = `
            <div class="doc-icon">📄</div>
            <h3>${doc.fileName}</h3>
            <p class="status-badge">${doc.category}</p>
            <p style="font-size:0.8rem; margin: 10px 0;">Uploaded: ${doc.createdAt ? formatDate(doc.createdAt) : 'Just now'}</p>
            <div style="margin-top: 15px;">
                <a href="${doc.fileData}" download="${doc.fileName}" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem">Download / View</a>
                <button onclick="deleteDoc('${doc.id}')" class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem">Delete</button>
            </div>
        `;
        docGrid.appendChild(div);
    });
}

// Filter Logic
function filterDocs() {
    const query = searchBar.value.toLowerCase();
    const cat = categoryFilter.value;

    const filtered = allDocs.filter(doc => {
        const matchesSearch = doc.fileName.toLowerCase().includes(query);
        const matchesCat = cat === 'all' || doc.category === cat;
        return matchesSearch && matchesCat;
    });
    renderDocs(filtered);
}

if(searchBar) searchBar.addEventListener('input', filterDocs);
if(categoryFilter) categoryFilter.addEventListener('change', filterDocs);

// Delete Logic
window.deleteDoc = async (docId) => {
    if(!confirm("Are you sure? This cannot be undone.")) return;

    try {
        await db.collection('documents').doc(docId).delete();
        
        if(window.Logger) {
            await Logger.log("DELETE", `Deleted document ID: ${docId}`);
        }
        alert("Document deleted.");
    } catch (e) {
        console.error(e);
        alert("Delete failed: " + e.message);
    }
};