// src/routes/SearchRecipes/CategoryResults.jsx
import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";

import { recipesData } from "./recipesData";
import RecipeCardList from "./RecipeCardList";
import RecipeCardExtension from "./RecipeCardExtension";
import "./CategoryResults.css";

export default function CategoryResults() {
  const { category } = useParams();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // grab the array (or empty if not found)
  const recipes = recipesData[category] || [];

  const handleRecipeClick = (r) => {
    setSelectedRecipe(r);
    setIsModalOpen(true);
  };
  const handleClose = () => {
    setSelectedRecipe(null);
    setIsModalOpen(false);
  };

  return (
    <div className="category-results-page">
      <div className="back-link">
        <Link to="/searchRecipes">← Back to Categories</Link>
      </div>

      <h1 className="section-title">{category} Recipes</h1>

      {recipes.length > 0 ? (
        <RecipeCardList
          recipes={recipes}
          onRecipeClick={handleRecipeClick}
        />
      ) : (
        <p>No recipes found for {category}.</p>
      )}

      {isModalOpen && selectedRecipe && (
        <RecipeCardExtension
          recipeName={selectedRecipe.recipe_name}
          instructions={selectedRecipe.instructions}
          preparationTime={selectedRecipe.preparation_time}
          totalServings={selectedRecipe.total_servings}
          ingredients={selectedRecipe.ingredients}
          handleCardClick={handleClose}
        />
      )}
    </div>
  );
}
