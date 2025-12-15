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
                tbody.innerHTML = '';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const row = `
                        <tr style="border-bottom: 1px solid #ddd;">
                            <td style="padding: 10px;">${formatDate(data.timestamp)}</td>
                            <td style="padding: 10px; font-weight:bold;">${data.action}</td>
                            <td style="padding: 10px;">${data.description}</td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
            });
    }
});