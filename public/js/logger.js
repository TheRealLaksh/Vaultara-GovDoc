const Logger = {
    log: async (action, description) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await db.collection('logs').add({
                userId: user.uid,
                action: action,
                description: description,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[LOGGED]: ${action} - ${description}`);
        } catch (error) {
            console.error("Logging failed", error);
        }
    }
};
// Make Logger available globally
window.Logger = Logger;