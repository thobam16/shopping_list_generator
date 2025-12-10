import { db, auth } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');
const ingContainer = document.getElementById('ingredients-container');

// --- Auth State ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginForm.style.display = 'none';
        adminPanel.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
        adminPanel.style.display = 'none';
    }
});

document.getElementById('login-btn').addEventListener('click', () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(err => alert(err.message));
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// --- Form Logic ---
const units = ["units", "grams", "ml", "cups", "tbsp", "tsp"];
const cats = ["produce", "dairy", "meat_seafood", "baked", "pantry", "other"];

function addRow() {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
        <input type="text" class="name" placeholder="Name (e.g. Onion)" required>
        <input type="number" class="qty" placeholder="Qty" step="0.1" required>
        <select class="unit">${units.map(u => `<option value="${u}">${u}</option>`).join('')}</select>
        <select class="cat">${cats.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
        <button type="button" onclick="this.parentElement.remove()" style="color:red; border:none; background:none; cursor:pointer;">×</button>
    `;
    ingContainer.appendChild(row);
}

// Add one initial row
addRow(); 
document.getElementById('add-row-btn').addEventListener('click', addRow);

document.getElementById('recipe-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('recipe-title').value;
    
    // Parse Rows
    const rows = document.querySelectorAll('.ingredient-row');
    const ingredients = Array.from(rows).map(row => ({
        name: row.querySelector('.name').value,
        quantity: parseFloat(row.querySelector('.qty').value),
        unit: row.querySelector('.unit').value,
        category: row.querySelector('.cat').value
    }));

    try {
        await addDoc(collection(db, "recipes"), { title, ingredients });
        alert("Recipe Saved!");
        e.target.reset();
        ingContainer.innerHTML = '';
        addRow();
    } catch(err) {
        alert("Error saving: " + err.message);
    }
});