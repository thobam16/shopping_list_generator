import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD4sL-krLqdOx4CPRrBkF8VHWOHcjBditQ",
  authDomain: "shopping-list-generator-14c2e.firebaseapp.com",
  projectId: "shopping-list-generator-14c2e",
  storageBucket: "shopping-list-generator-14c2e.firebasestorage.app",
  messagingSenderId: "214803379550",
  appId: "1:214803379550:web:b2b2a14f97e4b57a850bcf",
  measurementId: "G-03Y5XD0GRB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };