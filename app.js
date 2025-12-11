import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const recipeContainer = document.getElementById('recipe-container');
const generateBtn = document.getElementById('generate-btn');
const listSection = document.getElementById('shopping-list-section');
const listOutput = document.getElementById('list-output');
const filterContainer = document.getElementById('filter-container'); // Add this selector
const modal = document.getElementById('recipe-modal');
const closeModal = document.querySelector('.close-modal');

let allRecipes = [];

// Close modal logic
closeModal.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

// 1. Fetch Recipes from Firestore
async function init() {
    try {
        const querySnapshot = await getDocs(collection(db, "recipes"));
        allRecipes = []; // Reset global array
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Store data with ID and ensure a default cuisine exists
            allRecipes.push({ id: doc.id, ...data, cuisine: data.cuisine || 'General' });
        });

        generateFilters(); // Create the filter buttons
        renderRecipes(allRecipes); // Render all recipes initially

    } catch (e) {
        console.error("Error", e);
        recipeContainer.innerHTML = "<p>Error loading recipes. Check console.</p>";
    }
}

// Function to render the cards (extracted from init)
function renderRecipes(recipesToRender) {
    recipeContainer.innerHTML = "";
    
    if(recipesToRender.length === 0) {
        recipeContainer.innerHTML = "<p>No recipes found for this category.</p>";
        return;
    }

    recipesToRender.forEach((data) => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const bgImage = data.image ? data.image : 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=800&auto=format&fit=crop';

        // UPDATED HTML: Added wrapper div for checkbox+text, and a separate View Button
        card.innerHTML = `
            <label>
                <div class="card-img" style="background-image: url('${bgImage}')">
                    <span class="cuisine-tag">${data.cuisine}</span>
                </div>
                <div class="card-content">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <input type="checkbox" value="${data.id}"> 
                        <span class="recipe-title">${data.title}</span>
                    </div>
                    <button class="btn-mini view-btn" type="button">View</button>
                </div>
            </label>
        `;
        
        // Checkbox Logic
        card.addEventListener('change', (e) => {
            if(e.target.checked) card.classList.add('selected');
            else card.classList.remove('selected');
        });

        // NEW: View Button Logic
        const viewBtn = card.querySelector('.view-btn');
        viewBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Stop label from clicking checkbox
            e.stopPropagation(); // Stop bubbling
            openRecipeModal(data);
        });
        
        recipeContainer.appendChild(card);
    });
}

function openRecipeModal(recipe) {
    // Populate Data
    document.getElementById('modal-title').innerText = recipe.title;
    document.getElementById('modal-cuisine').innerText = recipe.cuisine;
    document.getElementById('modal-ing-count').innerText = `${recipe.ingredients.length} Ingredients`;
    
    // Handle Image
    const bgImage = recipe.image ? recipe.image : 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=800&auto=format&fit=crop';
    document.getElementById('modal-header-img').style.backgroundImage = `url('${bgImage}')`;

    // Handle Instructions (Fallback if empty)
    const instructions = recipe.instructions ? recipe.instructions : "No instructions provided for this recipe.";
    document.getElementById('modal-instructions').innerText = instructions;

    // Handle Ingredients List
    const ingList = document.getElementById('modal-ingredients');
    ingList.innerHTML = '<ul>' + 
        recipe.ingredients.map(ing => `<li>${ing.quantity} ${ing.unit} <strong>${ing.name}</strong></li>`).join('') + 
        '</ul>';

    // Show Modal
    modal.style.display = "block";
}

// Generate Filter Buttons
function generateFilters() {
    // 1. Get unique cuisines present in the data
    const cuisines = ['All', ...new Set(allRecipes.map(r => r.cuisine))].sort();
    
    filterContainer.innerHTML = '';

    cuisines.forEach(c => {
        const btn = document.createElement('button');
        btn.textContent = c;
        btn.className = c === 'All' ? 'filter-btn active' : 'filter-btn';
        
        btn.addEventListener('click', () => {
            // Visual Active State
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter Logic
            if (c === 'All') {
                renderRecipes(allRecipes);
            } else {
                const filtered = allRecipes.filter(r => r.cuisine === c);
                renderRecipes(filtered);
            }
        });

        filterContainer.appendChild(btn);
    });
}

// 2. Generate Button Logic
generateBtn.addEventListener('click', () => {
    const selectedIds = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    
    if(selectedIds.length === 0) { alert("Please select at least one recipe!"); return; }

    const aggregated = aggregateIngredients(selectedIds);
    renderList(aggregated);
    
    listSection.style.display = 'block';
    listSection.scrollIntoView({ behavior: 'smooth' });
});

// 3. Aggregation Logic (The Math)
function aggregateIngredients(ids) {
    const map = {};

    ids.forEach(id => {
        const recipe = allRecipes.find(r => r.id === id);
        recipe.ingredients.forEach(ing => {
            // Create a unique key based on Name + Unit (e.g. "onion_units" vs "onion_grams")
            const key = `${ing.name.toLowerCase().trim()}_${ing.unit}`;
            
            if(map[key]) {
                map[key].quantity += parseFloat(ing.quantity);
            } else {
                map[key] = { ...ing, quantity: parseFloat(ing.quantity) };
            }
        });
    });

    return Object.values(map);
}

// 4. Render Sorted by Category
function renderList(ingredients) {
    listOutput.innerHTML = "";
    
    const catOrder = ["produce", "meat_seafood", "dairy", "baked", "pantry", "other"];
    const grouped = {};

    ingredients.forEach(ing => {
        if(!grouped[ing.category]) grouped[ing.category] = [];
        grouped[ing.category].push(ing);
    });

    catOrder.forEach(cat => {
        if(grouped[cat]) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group';
            groupDiv.innerHTML = `<h3>${cat.replace('_', ' ')}</h3>`;
            
            // Sort alphabetically within category
            grouped[cat].sort((a,b) => a.name.localeCompare(b.name)).forEach(ing => {
                groupDiv.innerHTML += `
                    <div class="ingredient-item">
                        <span>${ing.name}</span>
                        <strong>${ing.quantity} ${ing.unit}</strong>
                    </div>`;
            });
            listOutput.appendChild(groupDiv);
        }
    });
}

// Utilities
document.getElementById('print-btn').addEventListener('click', () => window.print());
document.getElementById('copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(listOutput.innerText).then(() => alert("Copied to clipboard!"));
});

init();