import React, { useState, useEffect, useRef } from 'react';
import "./Menustyles.css";
import WaterTracker from '../../components/WaterTracker';




const newMenu = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);

  // List of food items
  const foodItems = [
    { category: 'breakfast', name: 'Banana Spice Smoothie' },
    { category: 'breakfast', name: 'Pumpkin Oatmeal' },
    { category: 'breakfast', name: 'Carrot Ginger Juice' },
    { category: 'lunch', name: 'Stuffed Green Peppers' },
    { category: 'lunch', name: 'Easy Chicken Enchilada Casserole' },
    { category: 'lunch', name: 'Mushroom & Leek Risotto' },
    { category: 'dinner', name: 'Mushroom & Leek Risotto' },
    { category: 'dinner', name: 'Cottage Cheese with Pineapple Chunks' },
    { category: 'dinner', name: 'Whole Grain Crackers' },
    { category: 'extras', name: 'Soup' },
    { category: 'extras', name: 'Salad' },
    { category: 'extras', name: 'Fruit' },
  ];

  useEffect(() => {
    // Filter the items based on the search term
    if (searchTerm) {
      const filtered = foodItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems([]);
    }
  }, [searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  //html code including food items
  return (
    <main>
        <div class="mainBox">
        
        <div class = "Title">
        <h2>MENU</h2>
        </div>

        <div class="daySelctionText">
          <h3>Today</h3>
        </div>

        <div class="breakfastBox">
          <div class = "breakfastBoxSub1">
          <div class="breakfastBoxSub1text1">
          <p>Banana Spice Smoothie</p>
        </div>

        <div class="breakfastBoxTitle">
          <p>Breakfast</p>
        </div>
          </div>
          <div class = "breakfastBoxSub2">
          <div class="breakfastBoxSub1text2">
          <p>Pumpkin Oatmeal</p>
        </div>
         </div>
          <div class = "breakfastBoxSub3">
          <div class="breakfastBoxSub1text3">
          <p>Carrot Ginger Juice</p>
        </div>
        </div>
        </div>

      
        <div class="breakfastBox2">
          <div class = "breakfastBoxSub21">
          <div class="breakfastBoxSub2text1">
          <p>Creamy Vegetable Soup</p>
          </div>
        </div>
          <div class = "breakfastBoxSub22">
          <div class="breakfastBoxSub2text2">
          <p>Harb Cauliflower Bean Dip</p>
          </div>
          </div>
          <div class = "breakfastBoxSub23">
          <div class="breakfastBoxSub2text3">
          <p>Spanish & Mushroom Omelette</p>
          </div>
          </div>
        </div>

        <div class="breakfastBoxTitle2">
          <p>Lunch</p>
        </div>

        <div class="breakfastBox3">
          <div class = "breakfastBoxSub31">
          <div class="breakfastBoxSub3text1">
            <p>Stuffed green Peppers</p>
          </div>
          </div>
          <div class = "breakfastBoxSub32">
          <div class="breakfastBoxSub3text2">
            <p>Easy Chicken Enchiladu Casserole</p>
          </div>
          </div>
          <div class = "breakfastBoxSub33"></div>
          <div class="breakfastBoxSub3text3">
            <p>Mushroom & Leek Risotto</p>
          </div>
        </div>

        <div class="breakfastBoxTitle3">
          <p>Dinner</p>
        </div>

        <div class="breakfastBox4">
          <div class = "breakfastBoxSub41">
          <div class="breakfastBoxSub4text1">
            <p>Mushroom & Leek Risotto</p>
          </div>
          </div>
          <div class = "breakfastBoxSub42">
          <div class="breakfastBoxSub4text2">
          <p>Cottage cheese with pieapple chunks</p>
          </div>
          </div>
          <div class = "breakfastBoxSub43">
          <div class="breakfastBoxSub4text3">
            <p>whole grain crackers</p>
            </div>
          </div>
        </div>

        <div class="breakfastBoxTitle4">
          <p>Extras</p>
          </div>

        {/* Render filtered food items */}
        {filteredItems.map((item, index) => (
          <div className="menuItem" key={index}>
            <p>{item.name}</p>
          </div>
        ))}
        <WaterTracker />
      </div>
    </main>
  );
};

export default newMenu;
