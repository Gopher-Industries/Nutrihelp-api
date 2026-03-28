import React, { useState } from 'react';

const MenuPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('breakfast');

  const menuItems = {
    breakfast: [
      { name: 'Berry Smoothie', description: 'A healthy berry smoothie to start your day.', image: 'menup_berrySmoothie.jpg' },
      { name: 'Oatmeal', description: 'A nutritious oatmeal breakfast.', image: 'menup_oatmeal.jpg' },
      { name: 'Oatmeal 2', description: 'Another variation of oatmeal.', image: 'menup_oatmeal2.jpg' },
      { name: 'Omelette', description: 'A protein-packed omelette.', image: 'menup_omelete.jpg' }
    ],
    lunch: [
      { name: 'Quinoa Salad', description: 'A healthy quinoa salad with vegetables.', image: 'menup_quinoaSalad.jpg' },
      { name: 'Salmon', description: 'Grilled salmon with sides.', image: 'menup_salmon.jpg' },
      { name: 'Vegetable', description: 'Fresh mixed vegetables.', image: 'menup_vegetable.jpg' }
    ],
    dinner: [
      { name: 'Chicken Wings', description: 'Spicy and crispy chicken wings.', image: 'menup_chickenWings.jpg' },
      { name: 'Broccoli', description: 'Steamed broccoli for dinner.', image: 'menup_broccoli.jpg' },
      { name: 'Hotdog', description: 'Delicious hotdog for dinner.', image: 'menup_hotdog.jpg' }
    ],
    extras: [
      { name: 'Avocado', description: 'Sliced avocado as a healthy side.', image: 'menup_avocado.jpg' },
      { name: 'Chocolate Cake', description: 'A sweet treat for dessert.', image: 'menup_chocolateCake.jpg' }
    ]
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const filteredItems = menuItems[activeTab].filter(item =>
    item.name.toLowerCase().includes(searchTerm)
  );

  return (
    <div className="menu-page">
      <div className="tabs">
        <button className={activeTab === 'breakfast' ? 'active' : ''} onClick={() => setActiveTab('breakfast')}>Breakfast</button>
        <button className={activeTab === 'lunch' ? 'active' : ''} onClick={() => setActiveTab('lunch')}>Lunch</button>
        <button className={activeTab === 'dinner' ? 'active' : ''} onClick={() => setActiveTab('dinner')}>Dinner</button>
        <button className={activeTab === 'extras' ? 'active' : ''} onClick={() => setActiveTab('extras')}>Extras</button>
      </div>

      <div className="menu-content">
        <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Menu</h3>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for food items..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="food-items">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <div className="food-card" key={index}>
                <img src={`./menupage_img/${item.image}`} alt={item.name} />
                <div className="food-details">
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No items found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
