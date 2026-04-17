import React from 'react';
import { FaStar, FaClock, FaFire } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './RecipeCard.css';

function RecipeCard({ id, title, description, tags, rating, prepTime, calories }) {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/recipe/${id}`);
    };

    const renderStars = () => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars.push(<FaStar key={i} className="star filled" />);
            } else if (i === fullStars + 1 && hasHalfStar) {
                stars.push(<FaStar key={i} className="star half-filled" />);
            } else {
                stars.push(<FaStar key={i} className="star" />);
            }
        }

        return (
            <div className="rating">
                {stars}
                <span className="rating-value">{rating.toFixed(1)}</span>
            </div>
        );
    };

    return (
        <div className="recipe-card" onClick={handleCardClick}>
            <div className="card-header">
                <div className="card-badge">#{id}</div>
                <h3 className="recipe-title">{title}</h3>
            </div>

            <p className="recipe-desc">{description}</p>

            <div className="stats-container">
                <div className="stat">
                    <FaClock className="stat-icon" />
                    <span>{prepTime}Minutes</span>
                </div>
                <div className="stat">
                    <FaFire className="stat-icon" />
                    <span>{calories}Calorie</span>
                </div>
            </div>

            {renderStars()}

            <div className="tag-group">
                {tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                ))}
            </div>

            <button className="view-recipe-btn">View the complete recipe</button>
        </div>
    );
}

export default RecipeCard;