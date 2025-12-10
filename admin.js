import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    deleteDoc, 
    doc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');
const ingContainer = document.getElementById('ingredients-container');
const recipeListContainer = document.getElementById('recipe-list');

let unsubscribeRecipes = null; // To stop listening when logged out

// --- 1. Auth State & Real-time Listener ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginForm.style.display = 'none';
        adminPanel.style.display = 'block';
        loadRecipes(); // <--- Start listening for recipes
    } else {
        loginForm.style.display = 'block';
        adminPanel.style.display = 'none';
        if(unsubscribeRecipes) unsubscribeRecipes(); // Stop listening
    }
});

document.getElementById('login-btn').addEventListener('click', () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(err => alert(err.message));
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// --- 2. Load & Delete Logic ---
function loadRecipes() {
    // onSnapshot runs every time the database changes (adds/deletes)
    unsubscribeRecipes = onSnapshot(collection(db, "recipes"), (snapshot) => {
        recipeListContainer.innerHTML = ''; // Clear list
        
        if (snapshot.empty) {
            recipeListContainer.innerHTML = '<p>No recipes found.</p>';
            return;
        }

        snapshot.forEach((docSnapshot) => {
            const recipe = docSnapshot.data();
            const id = docSnapshot.id;

            const item = document.createElement('div');
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;";
            
            item.innerHTML = `
                <span><strong>${recipe.title}</strong> (${recipe.ingredients.length} ingredients)</span>
                <button class="delete-btn btn" style="background: #e74c3c; color: white; padding: 5px 10px; font-size: 0.8rem;">Delete</button>
            `;

            // Attach click event to the delete button
            item.querySelector('.delete-btn').addEventListener('click', () => handleDelete(id, recipe.title));
            
            recipeListContainer.appendChild(item);
        });
    });
}

async function handleDelete(id, title) {
    if(confirm(`Are you sure you want to delete "${title}"?`)) {
        try {
            await deleteDoc(doc(db, "recipes", id));
            // No need to alert or refresh; onSnapshot will update the UI automatically
        } catch (err) {
            alert("Error deleting: " + err.message);
        }
    }
}

// --- 3. Add Recipe Form Logic (Same as before) ---
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

// Initial Setup
addRow(); 
document.getElementById('add-row-btn').addEventListener('click', addRow);

document.getElementById('recipe-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('recipe-title').value;
    
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