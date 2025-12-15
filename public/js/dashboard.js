checkAuth();

const docGrid = document.getElementById('docGrid');
const loader = document.getElementById('docLoader');
const searchBar = document.getElementById('searchBar');
const categoryFilter = document.getElementById('categoryFilter');

let allDocs = [];

// Fetch Docs (Owned + Shared)
auth.onAuthStateChanged(user => {
    if (user) {
        // 1. Get my phone number from the "Ghost Email" (e.g. "9999999999@govdocs.test" -> "9999999999")
        const myPhone = user.email.split('@')[0];

        // 2. Query A: Documents I Own
        const ownQuery = db.collection('documents')
            .where('ownerId', '==', user.uid)
            .get();

        // 3. Query B: Documents Shared with Me
        const sharedQuery = db.collection('documents')
            .where('sharedWith', 'array-contains', myPhone)
            .get();

        // 4. Run both queries and combine results
        Promise.all([ownQuery, sharedQuery])
            .then(results => {
                // Process Owned Docs
                const ownedDocs = results[0].docs.map(doc => ({
                    id: doc.id, 
                    ...doc.data(), 
                    isShared: false
                }));

                // Process Shared Docs
                const sharedDocs = results[1].docs.map(doc => ({
                    id: doc.id, 
                    ...doc.data(), 
                    isShared: true
                }));
                
                // Combine and Sort by Date (Newest First)
                allDocs = [...ownedDocs, ...sharedDocs].sort((a,b) => {
                    // Handle timestamps safely
                    const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
                    const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
                    return dateB - dateA;
                });
                
                renderDocs(allDocs);
                if(loader) loader.classList.add('hidden');
            })
            .catch(error => {
                console.error("Error loading docs:", error);
                if(loader) loader.innerHTML = "<p>Error loading documents. Please refresh.</p>";
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
        const div = document.createElement('div');
        div.className = 'card';
        
        // Visual indicator for Shared docs
        const badge = doc.isShared 
            ? `<span style="background:#e3f2fd; color:#0d47a1; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-right:5px; font-weight:bold;">SHARED WITH ME</span>`
            : ``;

        // Delete button (Only show for OWNED documents)
        const deleteBtn = !doc.isShared 
            ? `<button onclick="deleteDoc('${doc.id}')" class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem">Delete</button>`
            : ``;

        // View/Download Button
        // For Base64 files, we set href directly to the data
        const viewBtn = `<a href="${doc.fileData}" download="${doc.fileName}" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem">Download</a>`;

        div.innerHTML = `
            <div class="doc-icon">📄</div>
            <h3>${doc.fileName}</h3>
            <div>${badge}<span class="status-badge">${doc.category}</span></div>
            <p style="font-size:0.8rem; margin: 10px 0;">
                ${doc.isShared ? 'Shared' : 'Uploaded'}: ${doc.createdAt ? formatDate(doc.createdAt) : 'Just now'}
            </p>
            <div style="margin-top: 15px;">
                ${viewBtn}
                ${deleteBtn}
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
        // Reload to update list
        window.location.reload();
    } catch (e) {
        console.error(e);
        alert("Delete failed: " + e.message);
    }
};