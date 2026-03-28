import React, { useState } from 'react';
import {
    Routes,
    Route
} from "react-router-dom";
import RecipeCard from './RecipeCard';
import RecipeDetail from './RecipeDetail';
import './RecipeRating.css';

function RecipeRating() {
    const [recipes] = useState([
        {
            id: 1,
            title: 'Nutritious Breakfast Combo',
            description: 'Whole wheat bread with brewed coffee and low-sugar cola, providing morning energy',
            tags: ['High Fat', 'High Salt', 'Quick'],
            rating: 3.5,
            prepTime: 10,
            calories: 320,
        },
        {
            id: 2,
            title: 'Fitness Lunch Set',
            description: 'Fresh salad with grilled chicken breast and fresh juice, a healthy low-fat high-protein option',
            tags: ['Low Fat', 'High Fiber', 'Fitness'],
            rating: 4.2,
            prepTime: 25,
            calories: 420,
        },
        {
            id: 3,
            title: 'Balanced Dinner',
            description: 'Pan-seared salmon with seasonal vegetables and multigrain rice, rich in omega-3 and dietary fiber',
            tags: ['High Protein', 'Balanced', 'Seafood'],
            rating: 4.7,
            prepTime: 35,
            calories: 580,
        },
        {
            id: 4,
            title: 'Vegan Power Bowl',
            description: 'Quinoa base with roasted vegetables and hummus, 100% plant-based protein source',
            tags: ['Vegetarian', 'High Fiber', 'Gluten-Free'],
            rating: 4.0,
            prepTime: 20,
            calories: 380,
        },
        {
            id: 5,
            title: 'Mediterranean Platter',
            description: 'Olives, feta cheese, grilled vegetables and pita bread with tzatziki sauce',
            tags: ['Mediterranean', 'Low Carb', 'Vegetarian'],
            rating: 4.5,
            prepTime: 15,
            calories: 350,
        },
        {
            id: 6,
            title: 'Asian Stir-Fry Special',
            description: 'Tofu and mixed vegetables in teriyaki sauce served with jasmine rice',
            tags: ['Asian', 'Vegan', 'Quick'],
            rating: 4.3,
            prepTime: 20,
            calories: 450,
        },
        {
            id: 7,
            title: 'Protein Power Smoothie',
            description: 'Banana, peanut butter, protein powder and almond milk blended to perfection',
            tags: ['High Protein', 'Quick', 'Breakfast'],
            rating: 4.1,
            prepTime: 5,
            calories: 280,
        },
        {
            id: 8,
            title: 'Classic Beef Burger',
            description: 'Grass-fed beef patty with cheese, lettuce and special sauce on brioche bun',
            tags: ['High Protein', 'Comfort Food', 'American'],
            rating: 4.6,
            prepTime: 30,
            calories: 650,
        },
        {
            id: 9,
            title: 'Detox Green Salad',
            description: 'Kale, spinach, avocado and superfood seeds with lemon vinaigrette',
            tags: ['Low Calorie', 'Detox', 'Vegan'],
            rating: 3.9,
            prepTime: 10,
            calories: 220,
        },
        {
            id: 10,
            title: 'Italian Pasta Primavera',
            description: 'Fresh pasta with seasonal vegetables in light cream sauce',
            tags: ['Italian', 'Vegetarian', 'Comfort Food'],
            rating: 4.4,
            prepTime: 25,
            calories: 480,
        },
        {
            id: 11,
            title: 'Basic Vegetable Soup',
            description: 'Simple vegetable soup with minimal seasoning',
            tags: ['Low Fat', 'Low Protein'],
            rating: 1.8,
            prepTime: 15,
            calories: 150,
        },
        {
            id: 12,
            title: 'Berry Yogurt Crunch Bowl',
            description: 'Greek yogurt topped with fresh mixed berries, chia seeds, and a light granola crunch for a fast, balanced snack',
            tags: ['Low sugar', 'High Protein', 'High Fiber'],
            rating: 4.4,
            prepTime: 5,
            calories: 300,
        }
    ]);

    return (
        <div className="recipe-rating-container">
            <header className="page-header">
                <h1>Recipe Rating</h1>
                <p>Discover the healthy recipes that best suit your taste and needs</p>
            </header>

            <div className="recipe-container">
                {recipes.map((recipe) => (
                    <RecipeCard
                        key={recipe.id}
                        {...recipe}
                    />
                ))}
            </div>
        </div>
    );
}

export default RecipeRating;