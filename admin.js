import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    deleteDoc,
    setDoc, // <--- Added this to allow updates
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
const recipeForm = document.getElementById('recipe-form');
const submitBtn = recipeForm.querySelector('button[type="submit"]'); // Grab the save button
const titleInput = document.getElementById('recipe-title');

let unsubscribeRecipes = null;
let editingId = null; // <--- Tracks if we are editing (null means creating new)

// --- 1. Auth State & Listener ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginForm.style.display = 'none';
        adminPanel.style.display = 'block';
        loadRecipes();
    } else {
        loginForm.style.display = 'block';
        adminPanel.style.display = 'none';
        if(unsubscribeRecipes) unsubscribeRecipes();
    }
});

document.getElementById('login-btn').addEventListener('click', () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(err => alert(err.message));
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// --- 2. Load, Delete & Edit Logic ---
function loadRecipes() {
    unsubscribeRecipes = onSnapshot(collection(db, "recipes"), (snapshot) => {
        recipeListContainer.innerHTML = ''; 
        
        if (snapshot.empty) {
            recipeListContainer.innerHTML = '<p>No recipes found.</p>';
            return;
        }

        snapshot.forEach((docSnapshot) => {
            const recipe = docSnapshot.data();
            const id = docSnapshot.id;

            const item = document.createElement('div');
            // Added styling for the button group
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);";
            
            item.innerHTML = `
                <span style="font-weight:bold; font-size:1.1rem;">${recipe.title}</span>
                <div style="display: flex; gap: 10px;">
                    <button class="edit-btn btn" style="background: #f39c12; color: white; padding: 8px 15px; font-size: 0.9rem;">Edit</button>
                    <button class="delete-btn btn" style="background: #e74c3c; color: white; padding: 8px 15px; font-size: 0.9rem;">Delete</button>
                </div>
            `;

            // Attach Events
            item.querySelector('.delete-btn').addEventListener('click', () => handleDelete(id, recipe.title));
            item.querySelector('.edit-btn').addEventListener('click', () => handleEdit(id, recipe));
            
            recipeListContainer.appendChild(item);
        });
    });
}

// --- NEW: Handle Edit Click ---
function handleEdit(id, recipe) {
    // 1. Set global edit state
    editingId = id;
    
    // 2. Scroll to top so user sees the form
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 3. Populate Title
    titleInput.value = recipe.title;

    // 4. Populate Ingredients
    ingContainer.innerHTML = ''; // Clear existing empty rows
    recipe.ingredients.forEach(ing => {
        addRow(ing); // Add row with data
    });

    // 5. Change Button Text and Color to indicate Edit Mode
    submitBtn.textContent = "Update Recipe";
    submitBtn.style.background = "#f39c12"; // Orange for update
    
    // 6. Add a "Cancel" button if it doesn't exist
    if(!document.getElementById('cancel-edit-btn')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-outline';
        cancelBtn.textContent = "Cancel Edit";
        cancelBtn.style.marginLeft = "10px";
        cancelBtn.onclick = resetForm; // Clicking cancel resets everything
        submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
    }
}

async function handleDelete(id, title) {
    if(confirm(`Are you sure you want to delete "${title}"?`)) {
        try {
            await deleteDoc(doc(db, "recipes", id));
            if(editingId === id) resetForm(); // If we deleted what we were editing, reset form
        } catch (err) {
            alert("Error deleting: " + err.message);
        }
    }
}

// --- 3. Add Recipe Form Logic ---
const units = ["units", "grams", "ml", "cups", "tbsp", "tsp"];
const cats = ["produce", "dairy", "meat_seafood", "baked", "pantry", "other"];

// Updated addRow to accept optional data
function addRow(data = null) {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    
    // Helper to safely get values if data exists
    const val = (key) => data ? data[key] : '';
    
    row.innerHTML = `
        <input type="text" class="name" placeholder="Item" value="${val('name')}" required>
        <input type="number" class="qty" placeholder="Qty" step="0.1" value="${val('quantity')}" required>
        <select class="unit">
            ${units.map(u => `<option value="${u}" ${data && data.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
        <select class="cat">
            ${cats.map(c => `<option value="${c}" ${data && data.category === c ? 'selected' : ''}>${c.replace('_',' ')}</option>`).join('')}
        </select>
        <button type="button" onclick="this.parentElement.remove()" style="color: #e74c3c; font-weight:bold; border:none; background:none; cursor:pointer; font-size:1.2rem;">&times;</button>
    `;
    ingContainer.appendChild(row);
}

// Initial Setup
addRow(); 
document.getElementById('add-row-btn').addEventListener('click', () => addRow());

// --- 4. Submit Handler (Create OR Update) ---
recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = titleInput.value;
    const rows = document.querySelectorAll('.ingredient-row');
    const ingredients = Array.from(rows).map(row => ({
        name: row.querySelector('.name').value,
        quantity: parseFloat(row.querySelector('.qty').value),
        unit: row.querySelector('.unit').value,
        category: row.querySelector('.cat').value
    }));

    try {
        if (editingId) {
            // UPDATE existing recipe
            await setDoc(doc(db, "recipes", editingId), { title, ingredients });
            alert("Recipe Updated!");
        } else {
            // CREATE new recipe
            await addDoc(collection(db, "recipes"), { title, ingredients });
            alert("Recipe Saved!");
        }
        resetForm(); // Clear everything
    } catch(err) {
        alert("Error saving: " + err.message);
    }
});

function resetForm() {
    recipeForm.reset();
    ingContainer.innerHTML = '';
    addRow(); // Add one empty row
    editingId = null; // Clear edit mode
    
    // Reset button styles
    submitBtn.textContent = "Save Recipe";
    submitBtn.style.background = ""; // Reset to default CSS
    submitBtn.classList.add('btn-success');
    
    // Remove cancel button if exists
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if(cancelBtn) cancelBtn.remove();
}