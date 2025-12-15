// REPLACE WITH YOUR ACTUAL KEYS FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBbwkaStRW6THos25ESYcgBkxl0dJqO3-g",
  authDomain: "gov-docs-b2a1f.firebaseapp.com",
  projectId: "gov-docs-b2a1f",
  storageBucket: "gov-docs-b2a1f.firebasestorage.app",
  messagingSenderId: "1047132723054",
  appId: "1:1047132723054:web:f8a01f1663dc825200537f"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// const storage = firebase.storage(); // DISABLED FOR SOLUTION 2