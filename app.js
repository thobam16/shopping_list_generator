import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const recipeContainer = document.getElementById('recipe-container');
const generateBtn = document.getElementById('generate-btn');
const listSection = document.getElementById('shopping-list-section');
const listOutput = document.getElementById('list-output');

let allRecipes = [];

// 1. Fetch Recipes from Firestore
async function init() {
    try {
        const querySnapshot = await getDocs(collection(db, "recipes"));
        recipeContainer.innerHTML = "";
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            allRecipes.push({ id: doc.id, ...data });

            // Create HTML Card
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <label>
                    <input type="checkbox" value="${doc.id}" style="transform: scale(1.5); margin-right: 10px;"> 
                    <b>${data.title}</b>
                </label>
            `;
            
            // Highlight effect
            card.addEventListener('change', (e) => {
                if(e.target.checked) card.classList.add('selected');
                else card.classList.remove('selected');
            });
            
            recipeContainer.appendChild(card);
        });
    } catch (e) {
        console.error("Error", e);
        recipeContainer.innerHTML = "<p>Error loading recipes. Check console.</p>";
    }
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