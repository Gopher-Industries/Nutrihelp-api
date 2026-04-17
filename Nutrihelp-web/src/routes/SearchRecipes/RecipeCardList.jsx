import React from "react";
import RecipeCard from "./RecipeCard";

function RecipeCardList({ recipes, onRecipeClick }) {
  return (
    <div className="recipes-container">
      {recipes.length > 0 ? (
        recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onClick={() => onRecipeClick(recipe)} // Pass the recipe on click
          />
        ))
      ) : (
        <p> </p>
      )}
    </div>
  );
}

export default RecipeCardList;
