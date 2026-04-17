import React from "react";
import "./RecipeCard.css";

const defaultImageUrl =
  "https://img.freepik.com/premium-vector/cooking-logo-design_636083-140.jpg";

function RecipeCard({ recipe, onClick }) {
  return (
    <div className="recipe-card-div" onClick={onClick}>
      <div className="image">
        <img
          src={recipe.recipe_image || defaultImageUrl}
          alt={recipe.recipe_name}
        />
      </div>

      {/* Recipe name in bright pink */}
      <div className="name-box">{recipe.recipe_name}</div>

      {/* Cuisine label */}
      <p className="meta">{recipe.cuisine_name}</p>
    </div>
  );
}

export default RecipeCard;
