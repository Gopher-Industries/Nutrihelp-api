import React from 'react';
import './MenuCard.css';

const Card = ({ item, imageMapping }) => {
  const itemData = imageMapping[item.name] || {};
  const displayedImage = itemData.image || item.imageUrl;
  const displayedTitle = itemData.title || item.name;
  const displayedDescription = itemData.description || item.description;
  const recipeLink = itemData.recipeLink || '#';


  console.log("Item Name:", item.name);
  console.log("Displayed Image:", displayedImage);

  return (
    <div className="menucard">
      <img src={displayedImage} alt={item.name} className="menucard-image" />
      <div className="menucard-body">
        <h5>{displayedTitle}</h5>
        <p>{displayedDescription}</p>
      </div>
      <div className="menucard-footer">
      <a href={recipeLink} target="_blank" rel="noopener noreferrer" className="recipe-link">Recipe</a>
      </div>
    </div>
  );
};

export default Card;
