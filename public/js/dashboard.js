checkAuth();

const docGrid = document.getElementById('docGrid');
const loader = document.getElementById('docLoader');
const searchBar = document.getElementById('searchBar');
const categoryFilter = document.getElementById('categoryFilter');
const docCountDisplay = document.getElementById('docCountDisplay');
const verifyBanner = document.getElementById('verifyBanner');

let allDocs = [];

// Verification Logic
window.sendVerification = async () => {
    const user = auth.currentUser;
    if(user) {
        try {
            await user.sendEmailVerification();
            alert(`Verification link sent to ${user.email}. Please check your inbox (and spam).`);
        } catch (error) {
            console.error(error);
            alert("Error sending link: " + error.message);
        }
    }
};

auth.onAuthStateChanged(async user => {
    if (user) {
        const myEmail = user.email; 
        
        // CHECK VERIFICATION STATUS
        if (!user.emailVerified && verifyBanner) {
            verifyBanner.classList.remove('hidden');
            verifyBanner.style.display = 'flex'; // Enforce flex
        } else if (verifyBanner) {
            verifyBanner.classList.add('hidden');
        }

        try {
            // 1. Get User Profile for Family ID
            let myFamilyId = null;
            const userDoc = await db.collection('users').doc(user.uid).get();
            if(userDoc.exists) myFamilyId = userDoc.data().familyId;

            // 2. Prepare Queries
            const queries = [
                db.collection('documents').where('ownerId', '==', user.uid).get(),
                db.collection('documents').where('sharedWith', 'array-contains', myEmail).get()
            ];

            // 3. Add Family Query
            if(myFamilyId) {
                queries.push(db.collection('documents').where('familyId', '==', myFamilyId).get());
            }

            // 4. Execute All
            const results = await Promise.all(queries);

            const ownedDocs = results[0].docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'OWNER' }));
            const sharedDocs = results[1].docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'SHARED' }));
            
            let familyDocs = [];
            if(results[2]) {
                familyDocs = results[2].docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'FAMILY' }));
            }

            // 5. Merge & Deduplicate
            const combined = [...ownedDocs, ...sharedDocs, ...familyDocs];
            const uniqueMap = new Map();
            
            combined.forEach(doc => {
                if(!uniqueMap.has(doc.id)) {
                    if(doc.type === 'FAMILY' && doc.ownerId === user.uid) {
                        doc.type = 'OWNER';
                    }
                    uniqueMap.set(doc.id, doc);
                }
            });

            allDocs = Array.from(uniqueMap.values()).sort((a,b) => {
                const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
                const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
                return dateB - dateA;
            });
            
            renderDocs(allDocs);
            if(loader) loader.classList.add('hidden');
            if(docCountDisplay) docCountDisplay.innerText = allDocs.length;

        } catch (error) {
            console.error("Error loading docs:", error);
            if(loader) loader.innerHTML = "<p>Error syncing vault.</p>";
        }
    }
});

function renderDocs(docs) {
    if(!docGrid) return;
    docGrid.innerHTML = '';
    
    if (docs.length === 0) {
        docGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <p style="color: var(--gov-slate); margin-bottom: 20px;">Secure Vault is empty.</p>
                <div style="display:flex; justify-content:center;">
                    <a href="upload.html" class="btn-primary-reveal" style="width: auto;">
                        <span class="btn-text-initial">Upload Document</span>
                        <div class="btn-bg-reveal"></div>
                        <div class="btn-text-reveal">
                            <span>Upload Now</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </div>
                    </a>
                </div>
            </div>`;
        return;
    }

    let delayCounter = 0;

    docs.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'ui-card anim-stagger-' + ((delayCounter++ % 3) + 1);
        
        const dateStr = doc.createdAt ? formatDate(doc.createdAt) : 'Processing...';
        
        let icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
        if(doc.category === 'Health') icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
        if(doc.category === 'Identity') icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

        let badge = `<span class="status-badge" style="background: #f0fdf4; color: #15803d;">SECURE</span>`;
        if (doc.type === 'SHARED') badge = `<span class="status-badge" style="background: #EFF6FF; color: #1d4ed8;">SHARED IN</span>`;
        if (doc.type === 'FAMILY') badge = `<span class="status-badge" style="background: #faf5ff; color: #7e22ce;">FAMILY</span>`;

        const downloadBtn = `
            <a href="${doc.fileData}" download="${doc.fileName}" class="btn-tab">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span class="expandable-tab-text">Download</span>
            </a>`;
            
        const deleteBtn = (doc.type === 'OWNER') 
            ? `<button onclick="deleteDoc('${doc.id}')" class="btn-tab btn-tab-danger">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span class="expandable-tab-text">Delete</span>
            </button>`
            : ``;

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 16px;">
                <div style="display:flex; gap: 12px; align-items:center;">
                    <div style="padding:10px; background:var(--gov-canvas); border-radius:12px;">${icon}</div>
                    <div>
                        <h3 style="font-size: 1rem; font-weight: 600; color: var(--gov-navy);">${doc.fileName}</h3>
                        <p style="font-size: 0.8rem; color: var(--gov-slate); margin-top:2px;">${doc.category} &bull; ${dateStr}</p>
                    </div>
                </div>
                ${badge}
            </div>
            <div style="display:flex; gap: 8px; border-top: 1px solid var(--gov-silver); padding-top: 16px;">
                ${downloadBtn}
                <div style="flex-grow:1"></div>
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
    if(!confirm("Are you sure you want to remove this document from the vault?")) return;
    try {
        await db.collection('documents').doc(docId).delete();
        if(window.Logger) await Logger.log("DELETE", `Deleted doc: ${docId}`);
        window.location.reload();
    } catch (e) {
        console.error(e);
        alert("Delete failed.");
    }
};