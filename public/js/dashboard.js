checkAuth();

const docGrid = document.getElementById('docGrid');
const loader = document.getElementById('docLoader');
const searchBar = document.getElementById('searchBar');
const categoryFilter = document.getElementById('categoryFilter');
const docCountDisplay = document.getElementById('docCountDisplay');

let allDocs = [];

// Fetch logic remains exactly identical
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
                if(docCountDisplay) docCountDisplay.innerText = allDocs.length;
            })
            .catch(error => {
                console.error("Error loading docs:", error);
                if(loader) loader.innerHTML = "<p>Error loading documents.</p>";
            });
    }
});

function renderDocs(docs) {
    if(!docGrid) return;
    docGrid.innerHTML = '';
    
    if (docs.length === 0) {
        docGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <p>No documents found.</p>
                <a href="upload.html" class="btn-pill" style="width: auto; margin-top: 10px;">
                    Upload First Document
                </a>
            </div>`;
        return;
    }

    docs.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'card';
        
        const dateStr = doc.createdAt ? formatDate(doc.createdAt) : '...';
        
        // Button Icons (SVG)
        const downloadIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
        const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

        // Buttons using "Type A" Tab style for secondary actions
        const downloadBtn = `
            <a href="${doc.fileData}" download="${doc.fileName}" class="btn-tab" style="font-size: 0.8rem; padding: 6px 12px; border: 1px solid var(--gov-silver);">
                ${downloadIcon} Download
            </a>`;
            
        const deleteBtn = !doc.isShared 
            ? `<button onclick="deleteDoc('${doc.id}')" class="btn-tab btn-tab-danger" style="font-size: 0.8rem; padding: 6px 12px; border: 1px solid var(--gov-silver);">
                ${trashIcon} Delete
            </button>`
            : ``;

        // Badge Logic
        const badge = doc.isShared 
            ? `<span style="background:#EFF6FF; color:#1E40AF; padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:700;">SHARED</span>` 
            : ``;

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h3 style="font-size: 1rem; margin-bottom: 4px;">${doc.fileName}</h3>
                    <p style="font-size: 0.8rem; margin:0;">${doc.category} &bull; ${dateStr}</p>
                </div>
                ${badge}
            </div>
            <div class="desktop-actions">
                ${downloadBtn}
                ${deleteBtn}
            </div>
        `;
        docGrid.appendChild(div);
    });
}

function filterDocs() {
    const query = searchBar.value.toLowerCase();
    const cat = categoryFilter.value;
    const filtered = allDocs.filter(doc => {
        return doc.fileName.toLowerCase().includes(query) && (cat === 'all' || doc.category === cat);
    });
    renderDocs(filtered);
}

if(searchBar) searchBar.addEventListener('input', filterDocs);
if(categoryFilter) categoryFilter.addEventListener('change', filterDocs);

window.deleteDoc = async (docId) => {
    if(!confirm("Permanently delete this document?")) return;
    try {
        await db.collection('documents').doc(docId).delete();
        if(window.Logger) await Logger.log("DELETE", `Deleted doc: ${docId}`);
        window.location.reload();
    } catch (e) {
        console.error(e);
        alert("Delete failed.");
    }
};