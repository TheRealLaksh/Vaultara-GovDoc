checkAuth();
const tbody = document.getElementById('logTableBody');

auth.onAuthStateChanged(user => {
    if(user && tbody) {
        // Show loading state initially if needed, or just wait for Firestore
        
        db.collection('logs')
            .where('userId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get()
            .then(snapshot => {
                tbody.innerHTML = ''; 

                if (snapshot.empty) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="3" style="text-align:center; padding: 40px; color: var(--gov-slate);">
                                No recent activity found.
                            </td>
                        </tr>
                    `;
                    return;
                }

                snapshot.forEach((doc, index) => {
                    const data = doc.data();
                    // Add animation delay based on index for the waterfall effect
                    const delayClass = `anim-stagger-${(index % 3) + 1}`;
                    
                    const row = `
                        <tr class="${delayClass}" style="border-bottom: 1px solid var(--gov-silver);">
                            <td style="padding: 16px; color: var(--gov-slate); font-size: 0.9rem; white-space: nowrap;">
                                ${formatDate(data.timestamp)}
                            </td>
                            <td style="padding: 16px;">
                                <span class="status-badge" style="background:var(--gov-canvas); color:var(--gov-navy); border: 1px solid var(--gov-silver);">
                                    ${data.action}
                                </span>
                            </td>
                            <td style="padding: 16px; color: var(--gov-graphite); font-weight: 500;">
                                ${data.description}
                            </td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
            })
            .catch(error => {
                console.error("Error loading activity:", error);
                tbody.innerHTML = `<tr><td colspan="3" style="padding:20px; color:red;">Error loading logs.</td></tr>`;
            });
    }
});