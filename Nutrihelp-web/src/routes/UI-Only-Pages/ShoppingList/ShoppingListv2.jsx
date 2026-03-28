import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus,  X,  Trash, Check, Edit2, Save} from 'lucide-react';
import './ShoppingList.css';
// import { shoppingListApi } from '../../../services/shoppingListApi'; // Uncomment when ready
// import { useAuth } from '../../../context/AuthContext'; // For user authentication

const ShoppingListv2 = () => {
    const location = useLocation();
    // const { user } = useAuth(); // Uncomment to get current user
    const [shoppingItems, setShoppingItems] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [newQuantity, setNewQuantity] = useState('1');
    const [newUnit, setNewUnit] = useState('piece');
    const [newCategory, setNewCategory] = useState('vegetable');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editQuantity, setEditQuantity] = useState('');
    const [editUnit, setEditUnit] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to generate shopping list from meal plan
    const generateShoppingListFromMealPlan = async (selectedItems) => {
        if (!selectedItems || selectedItems.length === 0) return [];
        
        const mealPlanItems = [];
        
        // TODO: Replace with actual API call when backend is ready
        // Example: const ingredients = await shoppingListApi.fetchRecipeIngredients(item.name);
        
        for (const item of selectedItems) {
            // For now, use local function. Later, fetch from API
            const ingredients = await getIngredientsForMeal(item.name, item.mealType);
            ingredients.forEach(ingredient => {
                mealPlanItems.push({
                    // id will be assigned by database
                    name: ingredient.name,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit,
                    category: ingredient.category,
                    checked: false,
                    fromMealPlan: true,
                    mealType: item.mealType
                });
            });
        }
        
        return mealPlanItems;
    };

    // Get required ingredients based on meal name
    // TODO: Replace with API call to fetch from database
    const getIngredientsForMeal = async (mealName, mealType) => {
        // When backend is ready, replace with:
        // return await shoppingListApi.fetchRecipeIngredients(mealName);
        
        // Temporary: Using hardcoded data
        const ingredientsMap = {
            'Oatmeal': [
                { name: 'Oats', quantity: 1, unit: 'cup', category: 'pantry' },
                { name: 'Milk', quantity: 1, unit: 'cup', category: 'dairy' },
                { name: 'Honey', quantity: 1, unit: 'tbsp', category: 'pantry' }
            ],
            'Omelete': [
                { name: 'Eggs', quantity: 3, unit: 'piece', category: 'dairy' },
                { name: 'Cheese', quantity: 50, unit: 'g', category: 'dairy' },
                { name: 'Bell Peppers', quantity: 1, unit: 'piece', category: 'vegetable' }
            ],
            'Berry Smoothie': [
                { name: 'Mixed Berries', quantity: 1, unit: 'cup', category: 'frozen' },
                { name: 'Yogurt', quantity: 1, unit: 'cup', category: 'dairy' },
                { name: 'Banana', quantity: 1, unit: 'piece', category: 'vegetable' }
            ],
            'Vegetable Stir-Fry': [
                { name: 'Broccoli', quantity: 1, unit: 'piece', category: 'vegetable' },
                { name: 'Carrots', quantity: 2, unit: 'piece', category: 'vegetable' },
                { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', category: 'pantry' }
            ],
            'Chocolate Cake': [
                { name: 'Flour', quantity: 2, unit: 'cup', category: 'pantry' },
                { name: 'Sugar', quantity: 1, unit: 'cup', category: 'pantry' },
                { name: 'Cocoa Powder', quantity: 3, unit: 'tbsp', category: 'pantry' },
                { name: 'Eggs', quantity: 2, unit: 'piece', category: 'dairy' }
            ],
            'Quinoa Salad': [
                { name: 'Quinoa', quantity: 1, unit: 'cup', category: 'pantry' },
                { name: 'Cucumber', quantity: 1, unit: 'piece', category: 'vegetable' },
                { name: 'Cherry Tomatoes', quantity: 1, unit: 'cup', category: 'vegetable' }
            ],
            'Chicken Wings': [
                { name: 'Chicken Wings', quantity: 6, unit: 'piece', category: 'meat' },
                { name: 'Hot Sauce', quantity: 2, unit: 'tbsp', category: 'pantry' },
                { name: 'Butter', quantity: 2, unit: 'tbsp', category: 'dairy' }
            ],
            'Hotdog': [
                { name: 'Hotdog Buns', quantity: 2, unit: 'piece', category: 'pantry' },
                { name: 'Hotdog Sausages', quantity: 2, unit: 'piece', category: 'meat' },
                { name: 'Mustard', quantity: 1, unit: 'tbsp', category: 'pantry' }
            ],
            'Broccoli': [
                { name: 'Broccoli', quantity: 1, unit: 'piece', category: 'vegetable' },
                { name: 'Olive Oil', quantity: 1, unit: 'tbsp', category: 'pantry' },
                { name: 'Garlic', quantity: 2, unit: 'clove', category: 'vegetable' }
            ],
            'Avocado': [
                { name: 'Avocado', quantity: 1, unit: 'piece', category: 'vegetable' },
                { name: 'Lime', quantity: 1, unit: 'piece', category: 'vegetable' },
                { name: 'Salt', quantity: 1, unit: 'tsp', category: 'pantry' }
            ],
            'Salmon': [
                { name: 'Salmon Fillet', quantity: 1, unit: 'piece', category: 'meat' },
                { name: 'Lemon', quantity: 1, unit: 'piece', category: 'vegetable' },
                { name: 'Dill', quantity: 1, unit: 'tbsp', category: 'vegetable' }
            ],
            'Oatmeal2': [
                { name: 'Oats', quantity: 1, unit: 'cup', category: 'pantry' },
                { name: 'Milk', quantity: 1, unit: 'cup', category: 'dairy' },
                { name: 'Cinnamon', quantity: 1, unit: 'tsp', category: 'pantry' }
            ]
        };
        
        return ingredientsMap[mealName] || [];
    };

    // Load shopping list from database (or localStorage as fallback)
    useEffect(() => {
        const loadShoppingList = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // TODO: Replace with actual API call when backend is ready
                // const items = await shoppingListApi.fetchItems(user.id);
                
                // Temporary: Use localStorage
                const savedItems = localStorage.getItem('shoppingList');
                let items = savedItems ? JSON.parse(savedItems) : [];
                
                // Check if there's data passed from meal plan page
                if (location.state && location.state.selectedItems) {
                    const mealPlanItems = await generateShoppingListFromMealPlan(location.state.selectedItems);
                    
                    // TODO: When using backend, save to database instead
                    // await shoppingListApi.addMultipleItems(user.id, mealPlanItems);
                    
                    // Merge existing items with meal plan items, avoid duplicates
                    const existingNames = items.map(item => item.name.toLowerCase());
                    const newItems = mealPlanItems.filter(item => 
                        !existingNames.includes(item.name.toLowerCase())
                    );
                    
                    items = [...items, ...newItems];
                }
                
                setShoppingItems(items);
            } catch (err) {
                console.error('Error loading shopping list:', err);
                setError('Failed to load shopping list. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        
        loadShoppingList();
    }, [location.state]);

    // Save shopping list to database (or localStorage as fallback)
    useEffect(() => {
        // Skip saving on initial load
        if (loading) return;
        
        // TODO: Implement debounced API calls to save changes
        // For now, use localStorage
        localStorage.setItem('shoppingList', JSON.stringify(shoppingItems));
    }, [shoppingItems, loading]);

    const addItem = async () => {
        if (newItem.trim()) {
            try {
                const item = {
                    name: newItem.trim(),
                    quantity: parseInt(newQuantity) || 1,
                    unit: newUnit,
                    category: newCategory,
                    checked: false,
                    createdAt: new Date().toISOString()
                };
                
                // TODO: Replace with API call when backend is ready
                // const savedItem = await shoppingListApi.addItem(user.id, item);
                // setShoppingItems([...shoppingItems, savedItem]);
                
                // Temporary: Use local ID and update state
                const itemWithId = { ...item, id: Date.now() + Math.random() };
                setShoppingItems([...shoppingItems, itemWithId]);
                
                // Reset form
                setNewItem('');
                setNewQuantity('1');
                setNewUnit('piece');
                setNewCategory('vegetable');
            } catch (err) {
                console.error('Error adding item:', err);
                setError('Failed to add item. Please try again.');
            }
        }
    };

    const removeItem = async (id) => {
        try {
            // TODO: Replace with API call when backend is ready
            // await shoppingListApi.deleteItem(id);
            
            setShoppingItems(shoppingItems.filter(item => item.id !== id));
        } catch (err) {
            console.error('Error removing item:', err);
            setError('Failed to remove item. Please try again.');
        }
    };

    const toggleItem = async (id) => {
        try {
            const item = shoppingItems.find(item => item.id === id);
            
            // TODO: Replace with API call when backend is ready
            // await shoppingListApi.updateItem(id, { checked: !item.checked });
            
            setShoppingItems(shoppingItems.map(item => 
                item.id === id ? { ...item, checked: !item.checked } : item
            ));
        } catch (err) {
            console.error('Error toggling item:', err);
            setError('Failed to update item. Please try again.');
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditName(item.name);
        setEditQuantity(item.quantity);
        setEditUnit(item.unit);
        setEditCategory(item.category);
    };

    const saveEdit = async () => {
        if (!editName.trim()) {
            alert('Item name cannot be empty.');
            return;
        }
        
        try {
            const updates = {
                name: editName,
                quantity: parseInt(editQuantity) || 1,
                unit: editUnit,
                category: editCategory
            };
            
            // TODO: Replace with API call when backend is ready
            // await shoppingListApi.updateItem(editingId, updates);
            
            setShoppingItems(shoppingItems.map(item => 
                item.id === editingId ? { ...item, ...updates } : item
            ));
            
            setEditingId(null);
            setEditName('');
            setEditQuantity('');
            setEditUnit('');
            setEditCategory('');
        } catch (err) {
            console.error('Error saving edit:', err);
            setError('Failed to save changes. Please try again.');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditQuantity('');
        setEditUnit('');
        setEditCategory('');
    };

    const clearAll = async () => {
        try {
            // TODO: Replace with API call when backend is ready
            // const itemIds = shoppingItems.map(item => item.id);
            // await shoppingListApi.deleteMultipleItems(itemIds);
            
            setShoppingItems([]);
        } catch (err) {
            console.error('Error clearing all items:', err);
            setError('Failed to clear items. Please try again.');
        }
    };

    const clearMealPlanItems = async () => {
        try {
            // TODO: Replace with API call when backend is ready
            // const mealPlanItemIds = shoppingItems.filter(item => item.fromMealPlan).map(item => item.id);
            // await shoppingListApi.deleteMultipleItems(mealPlanItemIds);
            
            setShoppingItems(shoppingItems.filter(item => !item.fromMealPlan));
        } catch (err) {
            console.error('Error clearing meal plan items:', err);
            setError('Failed to clear meal plan items. Please try again.');
        }
    };

    const markAllAsPurchased = async () => {
        try {
            // TODO: Replace with API call when backend is ready
            // const updates = shoppingItems.map(item => ({ id: item.id, checked: true }));
            // await shoppingListApi.updateMultipleItems(updates);
            
            setShoppingItems(shoppingItems.map(item => ({ ...item, checked: true })));
        } catch (err) {
            console.error('Error marking items as purchased:', err);
            setError('Failed to update items. Please try again.');
        }
    };

    const markAllAsUnpurchased = async () => {
        try {
            // TODO: Replace with API call when backend is ready
            // const updates = shoppingItems.map(item => ({ id: item.id, checked: false }));
            // await shoppingListApi.updateMultipleItems(updates);
            
            setShoppingItems(shoppingItems.map(item => ({ ...item, checked: false })));
        } catch (err) {
            console.error('Error marking items as unpurchased:', err);
            setError('Failed to update items. Please try again.');
        }
    };

    const getFilteredItems = () => {
        if (filterCategory !== 'all') {
            return shoppingItems.filter(item => item.category === filterCategory);
        }
        return shoppingItems;
    };

    const categories = [
        { id: 'vegetable', name: '🥬 Vegetable', color: '#4CAF50' },
        { id: 'dairy', name: '🥛 Dairy', color: '#2196F3' },
        { id: 'meat', name: '🥩 Meat', color: '#FF5722' },
        { id: 'pantry', name: '🍞 Pantry', color: '#FF9800' },
        { id: 'frozen', name: '❄️ Frozen', color: '#9C27B0' },
        { id: 'beverages', name: '🥤 Beverages', color: '#607D8B' },
        { id: 'snacks', name: '🍿 Snacks', color: '#795548' },
        { id: 'household', name: '🧽 Household', color: '#9E9E9E' }
    ];

    const units = [
        { value: 'piece', label: 'piece' },
        { value: 'kg', label: 'kg' },
        { value: 'g', label: 'g' },
        { value: 'l', label: 'L' },
        { value: 'ml', label: 'ml' },
        { value: 'cup', label: 'cup' },
        { value: 'tbsp', label: 'tbsp' },
        { value: 'tsp', label: 'tsp' },
        { value: 'pack', label: 'pack' },
        { value: 'bottle', label: 'bottle' }
    ];

    const filteredItems = getFilteredItems();
    const mealPlanCount = shoppingItems.filter(item => item.fromMealPlan).length;

    return (
        <div className="shopping-list-page">
            <header className="shopping-list-header">
                <h1>Shopping List v2 (Backend Ready)</h1>
            </header>

            <div className="shopping-list-container">
                {/* Error message */}
                {error && (
                    <div className="error-message" style={{
                        padding: '15px',
                        marginBottom: '20px',
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '8px',
                        color: '#c00'
                    }}>
                        {error}
                        <button 
                            onClick={() => setError(null)}
                            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Loading state */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
                        <p style={{ fontSize: '18px' }}>Loading your shopping list...</p>
                    </div>
                ) : (
                    <>
                {/* Search and filter section */}
                <div className="filter-controls-container">
                    <div className="filter-controls-grid">
                        <div className="filter-control-group">
                            <label className="filter-control-label">
                                Filter by Category
                            </label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="filter-category-select"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-control-group">
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className={`toggle-add-form-btn ${showAddForm ? 'cancel' : 'add'}`}
                            >
                                {showAddForm ? <X size={24} /> : <Plus size={24} />}
                                {showAddForm ? 'Cancel' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add new item section */}
                {showAddForm && (
                    <div className="add-item-section">
                        <h2>Add New Item</h2>
                        <div className="add-item-form">
                            <input
                                type="text"
                                placeholder="Enter item name..."
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                className="item-input"
                            />
                            <input
                                type="number"
                                min="1"
                                value={newQuantity}
                                onChange={(e) => setNewQuantity(e.target.value)}
                                className="quantity-input"
                            />
                            <select 
                                value={newUnit} 
                                onChange={(e) => setNewUnit(e.target.value)}
                                className="unit-select"
                            >
                                {units.map(unit => (
                                    <option key={unit.value} value={unit.value}>
                                        {unit.label}
                                    </option>
                                ))}
                            </select>
                            <select 
                                value={newCategory} 
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="category-select"
                            >
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            <button onClick={addItem} className="add-button">
                                Add Item
                            </button>
                        </div>
                    </div>
                )
                }

                {/* Shopping list items */}
                <div className="items-section">
                    <div className="section-header">
                        <h2>Shopping Items</h2>
                        <div className="action-buttons-slist">
                            <button onClick={markAllAsPurchased} className="mark-all-btn" title="Mark all items as purchased">
                                ✅ Mark All Purchased
                            </button>
                            <button onClick={markAllAsUnpurchased} className="mark-all-btn" title="Mark all items as unpurchased">
                                ⏳ Mark All Unpurchased
                            </button>
                            {mealPlanCount > 0 && (
                                <button onClick={clearMealPlanItems} className="clear-meal-plan-btn">
                                    Clear Meal Plan Items
                                </button>
                            )}
                            <button onClick={clearAll} className="clear-all-btn">
                                Clear All
                            </button>
                        </div>
                    </div>

                    {filteredItems.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🛒</div>
                            <h3>No items found</h3>
                            <p>Add some items to your shopping list to get started!</p>
                        </div>
                    ) : (
                        <div className="items-list">
                            {filteredItems.map(item => {
                                const category = categories.find(cat => cat.id === item.category);
                                return (
                                    <div key={item.id} className={`shopping-item ${item.checked ? 'checked' : ''}`}>
                                        {editingId === item.id ? (
                                            <div className="edit-mode-container">
                                                <div className="edit-inputs-grid">
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        placeholder="Item name"
                                                        className="edit-name-input"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={editQuantity}
                                                        onChange={(e) => setEditQuantity(e.target.value)}
                                                        placeholder="Quantity"
                                                        className="quantity-edit"
                                                    />
                                                    <select
                                                        value={editUnit}
                                                        onChange={(e) => setEditUnit(e.target.value)}
                                                        className="unit-edit"
                                                    >
                                                        {units.map(unit => (
                                                            <option key={unit.value} value={unit.value}>
                                                                {unit.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={editCategory}
                                                        onChange={(e) => setEditCategory(e.target.value)}
                                                        className="category-edit"
                                                    >
                                                        {categories.map(category => (
                                                            <option key={category.id} value={category.id}>
                                                                {category.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="edit-buttons-container">
                                                    <button 
                                                        onClick={saveEdit}
                                                        className="save-edit-button"
                                                        title="Save changes"
                                                    >
                                                        <Save size={18} />
                                                        Save
                                                    </button>
                                                    <button 
                                                        onClick={cancelEdit}
                                                        className="cancel-edit-button"
                                                        title="Cancel editing"
                                                    >
                                                        <X size={18} />
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                            <div className="item-actions">
                                                <button
                                                    onClick={() => toggleItem(item.id)}
                                                    className={`purchase-btn ${item.checked ? 'purchased' : 'unpurchased'}`}
                                                    title={item.checked ? "Mark as not purchased" : "Mark as purchased"}
                                                >
                                                    {item.checked ? <Check size={24} /> : ' '}
                                                </button>
                                            </div>
                                            <div className="item-info">
                                                <span className="item-name">
                                                    {item.name}
                                                    {item.fromMealPlan && (
                                                        <span className="meal-plan-badge">
                                                            {item.mealType}
                                                        </span>
                                                    )}
                                                    {item.checked && (
                                                        <span className="purchased-badge">
                                                            ✅ Purchased
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="item-category" style={{ color: category?.color }}>
                                                    {item.quantity} {item.unit} - {category?.name}
                                                </span>
                                            </div>
                                            <div className="item-action-buttons">
                                                <button 
                                                    onClick={() => startEdit(item)}
                                                    className="edit-button"
                                                    title="Edit item"
                                                >
                                                    <Edit2 size={20} />
                                                </button>
                                                <button 
                                                    onClick={() => removeItem(item.id)}
                                                    className="remove-button"
                                                    title="Remove item"
                                                >
                                                    <Trash size={20}/>
                                                </button>
                                            </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Back to meal planning */}
                <div className="back-section">
                    <Link to="/Meal" className="back-button">
                        ← Back to Meal Planning
                    </Link>
                </div>
                </>
                )}
            </div>
        </div>
    );
};

export default ShoppingListv2;
