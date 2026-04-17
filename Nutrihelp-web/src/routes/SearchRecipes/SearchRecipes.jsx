import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./SearchRecipes.css";

import RecipeCardList from "./RecipeCardList";
import RecipeCardExtension from "./RecipeCardExtension";
import { fetchRecipes } from "./fetchRecipes";

// Category images
import chineseImg from "../../images/chinese.jpg";
import indianImg from "../../images/indian.jpg";
import mexicanImg from "../../images/mexican.jpg";
import saladsImg from "../../images/salads.jpg";
import thaiImg from "../../images/thai.jpg";
import italianImg from "../../images/italian.jpg";
import middleEasternImg from "../../images/middle_eastern.jpg";
import dessertsImg from "../../images/desserts.jpg";

function SearchRecipes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hard-coded category list
  const categories = [
    { name: "Chinese", img: chineseImg },
    { name: "Indian", img: indianImg },
    { name: "Mexican", img: mexicanImg },
    { name: "Salads", img: saladsImg },
    { name: "Thai", img: thaiImg },
    { name: "Italian", img: italianImg },
    { name: "Middle Eastern", img: middleEasternImg },
    { name: "Desserts", img: dessertsImg },
  ];

  // Load recipes once
  useEffect(() => {
    (async () => {
      try {
        const { recipes } = await fetchRecipes("15"); // this user returns 200
        setRecipes(recipes);
        console.log("Recipes loaded:", recipes.length);
      } catch (e) {
        console.error(e);
        setRecipes([]);
      }
    })();
  }, []);

  // Filter both categories *and* fetched recipes by the same searchTerm
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredRecipes = recipes.filter((r) =>
    r.recipe_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setSelectedRecipe(null);
    setIsModalOpen(false);
  };

  return (
    <div className="search-recipes-page">
      <div className="search-header">
        <h1 className="main-title">Recipes</h1>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search categories or recipes..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Top Categories</h2>
        <div className="categories-grid">
          {filteredCategories.length ? (
            filteredCategories.map((cat) => (
              <Link
                to={`/searchRecipes/${cat.name}`}
                key={cat.name}
                className="category-card"
              >
                <img src={cat.img} alt={cat.name} />
                <h3>{cat.name}</h3>
              </Link>
            ))
          ) : (
            <p className="no-results">No categories found.</p>
          )}
        </div>
      </div>

      <div className="recipes-list">
        <RecipeCardList recipes={filteredRecipes} onRecipeClick={handleRecipeClick} />
      </div>

      {isModalOpen && selectedRecipe && (
        <RecipeCardExtension
          recipeName={selectedRecipe.recipe_name}
          instructions={selectedRecipe.instructions}
          preparationTime={selectedRecipe.preparation_time}
          totalServings={selectedRecipe.total_servings}
          ingredients={selectedRecipe.ingredients}
          handleCardClick={handleCloseModal}
        />
      )}
    </div>
  );
}

export default SearchRecipes;
