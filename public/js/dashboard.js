checkAuth();

const docGrid = document.getElementById('docGrid');
const loader = document.getElementById('docLoader');
const searchBar = document.getElementById('searchBar');
const categoryFilter = document.getElementById('categoryFilter');
// Added for stats display
const docCountDisplay = document.getElementById('docCountDisplay');

let allDocs = [];

// Fetch Docs (Owned + Shared) - LOGIC UNCHANGED
auth.onAuthStateChanged(user => {
    if (user) {
        const myPhone = user.email.split('@')[0];
        const ownQuery = db.collection('documents').where('ownerId', '==', user.uid).get();
        const sharedQuery = db.collection('documents').where('sharedWith', 'array-contains', myPhone).get();

        Promise.all([ownQuery, sharedQuery])
            .then(results => {
                const ownedDocs = results[0].docs.map(doc => ({ id: doc.id, ...doc.data(), isShared: false }));
                const sharedDocs = results[1].docs.map(doc => ({ id: doc.id, ...doc.data(), isShared: true }));
                
                allDocs = [...ownedDocs, ...sharedDocs].sort((a,b) => {
                    const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
                    const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
                    return dateB - dateA;
                });
                
                renderDocs(allDocs);
                if(loader) loader.classList.add('hidden');
                // Update stats if element exists
                if(docCountDisplay) docCountDisplay.innerText = allDocs.length;
            })
            .catch(error => {
                console.error("Error loading docs:", error);
                if(loader) loader.innerHTML = "<p>Error loading documents. Please refresh.</p>";
            });
    }
});

// UI RENDER LOGIC - COMPLETELY REWRITTEN
function renderDocs(docs) {
    if(!docGrid) return;
    docGrid.innerHTML = '';
    
    if (docs.length === 0) {
        docGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: white; border: 1px dashed #E2E8F0; border-radius: 6px;">
                <p style="margin-bottom: 16px;">No documents found in the vault.</p>
                <a href="upload.html" class="btn">Upload First Document</a>
            </div>
        `;
        return;
    }

    docs.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'card';
        
        // Logic specific visuals
        const icon = doc.category === 'Identity' ? '🆔' : (doc.category === 'Health' ? '🏥' : '📄');
        const sharedBadge = doc.isShared ? `<span class="status-badge tag-shared">Shared With Me</span>` : '';
        const dateStr = doc.createdAt ? formatDate(doc.createdAt) : 'Processing...';

        // Conditional Buttons
        const deleteBtn = !doc.isShared 
            ? `<button onclick="deleteDoc('${doc.id}')" class="btn btn-danger" title="Delete Permanent">Delete</button>`
            : ``;

        // The HTML structure supports flex (mobile) and grid/block (desktop) via CSS
        div.innerHTML = `
            <div style="font-size: 2rem; background: #F8F9FA; padding: 12px; border-radius: 6px; text-align:center; min-width: 60px;">
                ${icon}
            </div>
            
            <div class="card-content">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:4px;">
                    <h3 style="margin:0; font-size: 1rem;">${doc.fileName}</h3>
                    ${sharedBadge}
                </div>
                
                <p style="margin:0; font-size:0.8rem; color: var(--gov-slate);">
                    <span style="font-weight:600; color:var(--gov-graphite);">${doc.category}</span> &bull; ${dateStr}
                </p>

                <div class="desktop-only" style="margin-top: 16px; display: flex; gap: 8px;">
                    <a href="${doc.fileData}" download="${doc.fileName}" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.85rem;">Download</a>
                    ${deleteBtn ? `<button onclick="deleteDoc('${doc.id}')" class="btn btn-danger" style="padding: 8px 16px; font-size: 0.85rem;">Delete</button>` : ''}
                </div>
            </div>

            <div class="mobile-only card-actions">
                <a href="${doc.fileData}" download="${doc.fileName}" class="btn btn-secondary">Download</a>
                ${deleteBtn}
            </div>
        `;
        docGrid.appendChild(div);
    });
}

// Filter Logic - UNCHANGED
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

// Delete Logic - UNCHANGED
window.deleteDoc = async (docId) => {
    if(!confirm("Are you sure? This document will be permanently removed from the vault.")) return;

    try {
        await db.collection('documents').doc(docId).delete();
        if(window.Logger) {
            await Logger.log("DELETE", `Deleted document ID: ${docId}`);
        }
        window.location.reload();
    } catch (e) {
        console.error(e);
        alert("Delete failed: " + e.message);
    }
};