checkAuth();
const tbody = document.getElementById('logTableBody');

auth.onAuthStateChanged(user => {
    if(user && tbody) {
        db.collection('logs')
            .where('userId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get()
            .then(snapshot => {
                tbody.innerHTML = ''; // Actually this ID is a UL now in new HTML, or we adapt.
                // NOTE: I will update the HTML to use a <tbody> for compatibility if needed, 
                // BUT for a "complete makeover" I should output modern DIVs.
                // However, the JS targets 'logTableBody'. I will keep it as a table but style it beautifully.
                
                snapshot.forEach((doc, index) => {
                    const data = doc.data();
                    // Add animation delay based on index
                    const delayClass = `anim-stagger-${(index % 3) + 1}`;
                    
                    const row = `
                        <tr class="${delayClass}" style="border-bottom: 1px solid var(--gov-silver);">
                            <td style="padding: 16px; color: var(--gov-slate); font-size: 0.9rem;">
                                ${formatDate(data.timestamp)}
                            </td>
                            <td style="padding: 16px;">
                                <span class="status-badge" style="background:var(--gov-canvas); color:var(--gov-navy);">
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
            });
    }
});