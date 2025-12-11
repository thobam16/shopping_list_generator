import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    deleteDoc,
    setDoc, 
    doc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM Elements
const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');
const ingContainer = document.getElementById('ingredients-container');
const recipeListContainer = document.getElementById('recipe-list');
const recipeForm = document.getElementById('recipe-form');
const submitBtn = recipeForm.querySelector('button[type="submit"]');
const titleInput = document.getElementById('recipe-title');
const cuisineInput = document.getElementById('recipe-cuisine');
const instructionsInput = document.getElementById('recipe-instructions');

// Image Elements
const imageFileInput = document.getElementById('image-file');
const imageHiddenInput = document.getElementById('recipe-image-base64');
const imagePreview = document.getElementById('image-preview');

let unsubscribeRecipes = null;
let editingId = null; 

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

// --- 2. Image Compression Logic ---
imageFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    resizeAndCompressImage(file, (resultBase64) => {
        imageHiddenInput.value = resultBase64; 
        imagePreview.innerHTML = `<img src="${resultBase64}" style="width: 100%; border-radius: 8px;">`;
    });
});

function resizeAndCompressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600; 
            const scaleSize = MAX_WIDTH / img.width;
            
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(dataUrl);
        };
    };
}

// --- 3. Load, Delete & Edit Logic ---
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
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);";
            
            item.innerHTML = `
                <span style="font-weight:bold; font-size:1.1rem;">${recipe.title}</span>
                <div style="display: flex; gap: 10px;">
                    <button class="edit-btn btn" style="background: #f39c12; color: white; padding: 8px 15px; font-size: 0.9rem;">Edit</button>
                    <button class="delete-btn btn" style="background: #e74c3c; color: white; padding: 8px 15px; font-size: 0.9rem;">Delete</button>
                </div>
            `;

            item.querySelector('.delete-btn').addEventListener('click', () => handleDelete(id, recipe.title));
            item.querySelector('.edit-btn').addEventListener('click', () => handleEdit(id, recipe));
            
            recipeListContainer.appendChild(item);
        });
    });
}

function handleEdit(id, recipe) {
    editingId = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    titleInput.value = recipe.title;
    cuisineInput.value = recipe.cuisine || 'General';
    instructionsInput.value = recipe.instructions || '';

    // Load Image if exists
    if(recipe.image) {
        imageHiddenInput.value = recipe.image;
        imagePreview.innerHTML = `<img src="${recipe.image}" style="width: 100%; border-radius: 8px;">`;
    } else {
        imageHiddenInput.value = "";
        imagePreview.innerHTML = "";
    }
    
    // Load Ingredients
    ingContainer.innerHTML = ''; 
    if (recipe.ingredients) {
        recipe.ingredients.forEach(ing => addRow(ing));
    } else {
        addRow();
    }

    // Update UI for Edit Mode
    submitBtn.textContent = "Update Recipe";
    submitBtn.style.background = "#f39c12"; 
    
    if(!document.getElementById('cancel-edit-btn')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-outline';
        cancelBtn.textContent = "Cancel Edit";
        cancelBtn.style.marginLeft = "10px";
        cancelBtn.onclick = resetForm; 
        submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
    }
}

async function handleDelete(id, title) {
    if(confirm(`Are you sure you want to delete "${title}"?`)) {
        try {
            await deleteDoc(doc(db, "recipes", id));
            if(editingId === id) resetForm(); 
        } catch (err) {
            alert("Error deleting: " + err.message);
        }
    }
}

// --- 4. Ingredient Form Logic ---
const units = ["units", "grams", "ml", "cups", "tbsp", "tsp"];
const cats = ["produce", "dairy", "meat_seafood", "baked", "pantry", "other"];

function addRow(data = null) {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    
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

addRow(); 
document.getElementById('add-row-btn').addEventListener('click', () => addRow());

// --- 5. Submit Handler (Create OR Update) ---
recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title   = titleInput.value;
    const cuisine = cuisineInput.value; 
    const image   = imageHiddenInput.value; 
    const instructions = instructionsInput.value;
    
    const rows = document.querySelectorAll('.ingredient-row');
    const ingredients = Array.from(rows).map(row => ({
        name: row.querySelector('.name').value,
        quantity: parseFloat(row.querySelector('.qty').value),
        unit: row.querySelector('.unit').value,
        category: row.querySelector('.cat').value
    }));

    const recipeData = { title, cuisine, image, instructions, ingredients };

    try {
        if (editingId) {
            await setDoc(doc(db, "recipes", editingId), recipeData);
            alert("Recipe Updated!");
        } else {
            await addDoc(collection(db, "recipes"), recipeData);
            alert("Recipe Saved!");
        }
        resetForm(); 
    } catch(err) {
        alert("Error saving: " + err.message);
    }
});

function resetForm() {
    recipeForm.reset();
    cuisineInput.value      = 'General'; 
    instructionsInput.value = ''; 
    ingContainer.innerHTML  = '';
    imagePreview.innerHTML  = '';       
    imageHiddenInput.value  = '';       
    addRow(); 
    editingId = null; 
    
    submitBtn.textContent = "Save Recipe";
    submitBtn.style.background = ""; 
    submitBtn.classList.add('btn-success');
    
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if(cancelBtn) cancelBtn.remove();
}