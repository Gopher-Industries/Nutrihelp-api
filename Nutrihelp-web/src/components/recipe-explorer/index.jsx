import React, { useState, useEffect } from "react";
import { recipes } from "./data";

const RecipeExplorer = () => {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [dietFilter, setDietFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [randomMeal, setRandomMeal] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [mealPlan, setMealPlan] = useState({});
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem("recipeFavorites");
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("recipeFavorites", JSON.stringify(favorites));
  }, [favorites]);

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesDiet = dietFilter === "all" || recipe.diet === dietFilter;
    const matchesSearch =
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDiet && matchesSearch;
  });

  const favoriteRecipes = recipes.filter((recipe) =>
    favorites.includes(recipe.id)
  );

  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe);
  };

  const closeDetails = () => {
    setSelectedRecipe(null);
  };

  const pickRandomMeal = () => {
    setIsSpinning(true);
    let spins = 0;
    const maxSpins = 10;
    const spinInterval = setInterval(() => {
      const tempRandomIndex = Math.floor(
        Math.random() * filteredRecipes.length
      );
      setRandomMeal(filteredRecipes[tempRandomIndex]);
      spins++;
      if (spins >= maxSpins) {
        clearInterval(spinInterval);
        setIsSpinning(false);
        const finalRandomIndex = Math.floor(
          Math.random() * filteredRecipes.length
        );
        setRandomMeal(filteredRecipes[finalRandomIndex]);
      }
    }, 100);
  };

  // Toggle favorite status for a recipe
  const toggleFavorite = (recipeId) => {
    if (favorites.includes(recipeId)) {
      setFavorites(favorites.filter((id) => id !== recipeId));
    } else {
      setFavorites([...favorites, recipeId]);
    }
  };

  // Add recipe to meal plan
  const addToMealPlan = (day, recipe) => {
    setMealPlan((prev) => ({
      ...prev,
      [day]: recipe,
    }));
  };

  // Remove recipe from meal plan
  const removeFromMealPlan = (day) => {
    const newMealPlan = { ...mealPlan };
    delete newMealPlan[day];
    setMealPlan(newMealPlan);
  };

  // Clear entire meal plan
  const clearMealPlan = () => {
    setMealPlan({});
  };

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div
      id="no-bg"
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6"
    >
      <header className="text-center mb-8" id="no-bg">
        <h1 className="text-4xl font-bold text-green-700 mb-2" id="no-bg">
          🍽️ Recipe Explorer
        </h1>
        <p className="text-gray-600" id="no-bg">
          Discover healthy meals and let fate decide your next dish!
        </p>
      </header>

      <div className="flex justify-center gap-4 mb-6" id="no-bg">
        <button
          id="no-bg"
          onClick={() => setShowMealPlanner(!showMealPlanner)}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-bold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg flex items-center"
        >
          {showMealPlanner ? "Hide Meal Planner" : "Show Meal Planner"}
          <span className="ml-2">📅</span>
        </button>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full font-bold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg flex items-center"
        >
          {showFavorites ? "Show All Recipes" : "Show Favorites"}
          <span className="ml-2">❤️</span>
        </button>
      </div>

      {showMealPlanner && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8" id="no-bg">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4 flex items-center">
            <span className="mr-2">📅</span> Weekly Meal Planner
          </h2>
          <div className="flex justify-end mb-4">
            <button
              onClick={clearMealPlan}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
            >
              Clear All
              <span className="ml-2">🗑️</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="bg-blue-50 rounded-lg p-4 border border-blue-200"
              >
                <h3 className="font-bold text-blue-700 mb-2">{day}</h3>
                {mealPlan[day] ? (
                  <div>
                    <img
                      src={mealPlan[day].image}
                      alt={mealPlan[day].name}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                    <p className="font-medium text-gray-800">
                      {mealPlan[day].name}
                    </p>
                    <button
                      onClick={() => removeFromMealPlan(day)}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm flex items-center"
                    >
                      Remove
                      <span className="ml-1">❌</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">
                    No meal planned
                    <div className="mt-2">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const recipe = recipes.find(
                              (r) => r.id === parseInt(e.target.value)
                            );
                            addToMealPlan(day, recipe);
                          }
                        }}
                        className="w-full text-sm p-1 rounded border"
                      >
                        <option value="">Add a recipe</option>
                        {filteredRecipes.map((recipe) => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-green-600 mb-4 flex items-center">
          <span className="mr-2">🎲</span> Random Meal Picker
        </h2>
        <div className="flex flex-col items-center">
          <button
            onClick={pickRandomMeal}
            disabled={isSpinning || filteredRecipes.length === 0}
            className={`px-6 py-3 rounded-full text-white font-bold mb-4 transition-all shadow-lg transform hover:scale-105 flex items-center ${
              isSpinning
                ? "bg-gray-400"
                : "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
            }`}
          >
            {isSpinning ? (
              <>
                <span className="animate-spin mr-2">🌀</span> Spinning...
              </>
            ) : (
              <>
                <span className="mr-2">🎯</span> Pick a Meal for Me!
              </>
            )}
          </button>

          {randomMeal && (
            <div className="w-full max-w-md bg-green-50 rounded-lg p-4 border border-green-200 animate-fadeIn">
              <h3 className="text-xl font-bold text-green-700 mb-2">
                {randomMeal.name}
              </h3>
              <p className="text-gray-600 mb-3">{randomMeal.description}</p>
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSelectedRecipe(randomMeal)}
                  className="text-green-600 hover:text-green-800 font-medium flex items-center"
                >
                  Show Recipe Details
                  <span className="ml-1">→</span>
                </button>
                {showMealPlanner && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addToMealPlan(e.target.value, randomMeal);
                      }
                    }}
                    className="text-sm p-1 rounded border"
                  >
                    <option value="">Add to day...</option>
                    {daysOfWeek.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="w-full md:w-1/2 relative">
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div className="w-full md:w-1/2">
          <select
            value={dietFilter}
            onChange={(e) => setDietFilter(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="all">All Diets</option>
            <option value="vegan">🌱 Vegan</option>
            <option value="low-carb">🥑 Low-Carb</option>
            <option value="high-protein">💪 High Protein</option>
          </select>
        </div>
      </div>

      {showFavorites && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-red-600 mb-4 flex items-center">
            <span className="mr-2">❤️</span> Your Favorite Recipes
          </h2>
          {favoriteRecipes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              You haven't added any favorites yet. Click the heart icon on
              recipes to add them here.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {favoriteRecipes.map((recipe) => (
                <div
                  id="no-bg"
                  key={recipe.id}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-1 transition-transform duration-300"
                >
                  <div id="no-bg" className="h-48 overflow-hidden relative">
                    <img
                      id="no-bg"
                      src={recipe.image}
                      alt={recipe.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      onClick={() => handleRecipeClick(recipe)}
                    />
                    <button
                      onClick={() => toggleFavorite(recipe.id)}
                      className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-red-100 transition-colors"
                    >
                      ❤️
                    </button>
                  </div>
                  <div id="no-bg" className="p-4">
                    <h3
                      id="no-bg"
                      className="text-xl font-bold text-gray-800 mb-2"
                      onClick={() => handleRecipeClick(recipe)}
                    >
                      {recipe.name}
                    </h3>
                    <p
                      id="no-bg"
                      className="text-gray-600 mb-3"
                      onClick={() => handleRecipeClick(recipe)}
                    >
                      {recipe.description}
                    </p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span className="capitalize">{recipe.diet}</span>
                      <span>⏱️ {recipe.prepTime}</span>
                    </div>
                    {showMealPlanner && (
                      <div className="mt-3">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addToMealPlan(e.target.value, recipe);
                            }
                          }}
                          className="w-full text-sm p-1 rounded border"
                        >
                          <option value="">Add to meal plan...</option>
                          {daysOfWeek.map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!showFavorites &&
        (filteredRecipes.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-lg">
              No recipes match your search criteria. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <div
                id="no-bg"
                key={recipe.id}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg  cursor-pointer transform hover:-translate-y-1 transition-transform duration-300"
              >
                <div id="no-bg" className="h-48 overflow-hidden relative">
                  <img
                    id="no-bg"
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    onClick={() => handleRecipeClick(recipe)}
                  />
                  <button
                    id="no-bg"
                    onClick={() => toggleFavorite(recipe.id)}
                    className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-colors ${
                      favorites.includes(recipe.id)
                        ? "bg-red-100 text-red-600"
                        : "bg-white text-gray-400 hover:bg-red-50"
                    }`}
                  >
                    {favorites.includes(recipe.id) ? "❤️" : "🤍"}
                  </button>
                </div>
                <div id="no-bg" className="p-4">
                  <h3
                    id="no-bg"
                    className="text-xl font-bold text-gray-800 mb-2"
                    onClick={() => handleRecipeClick(recipe)}
                  >
                    {recipe.name}
                  </h3>
                  <p
                    id="no-bg"
                    className="text-gray-600 mb-3"
                    onClick={() => handleRecipeClick(recipe)}
                  >
                    {recipe.description}
                  </p>
                  <div
                    id="no-bg"
                    className="flex justify-between items-center text-sm text-gray-500"
                  >
                    <span id="no-bg" className="capitalize">
                      {recipe.diet}
                    </span>
                    <span id="no-bg">⏱️ {recipe.prepTime}</span>
                  </div>
                  {showMealPlanner && (
                    <div className="mt-3">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addToMealPlan(e.target.value, recipe);
                          }
                        }}
                        className="w-full text-sm p-1 rounded border"
                      >
                        <option value="">Add to meal plan...</option>
                        {daysOfWeek.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

      {selectedRecipe && (
        <div
          id="no-bg"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img
                src={selectedRecipe.image}
                alt={selectedRecipe.name}
                className="w-full h-64 object-cover"
              />
              <button
                onClick={closeDetails}
                className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <button
                onClick={() => toggleFavorite(selectedRecipe.id)}
                className={`absolute top-4 left-4 p-2 rounded-full shadow-md transition-colors ${
                  favorites.includes(selectedRecipe.id)
                    ? "bg-red-100 text-red-600"
                    : "bg-white text-gray-400 hover:bg-red-50"
                }`}
              >
                {favorites.includes(selectedRecipe.id) ? "❤️" : "🤍"}
              </button>
            </div>
            <div className="p-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {selectedRecipe.name}
              </h2>
              <p className="text-gray-600 mb-4">{selectedRecipe.description}</p>

              <div className="flex gap-4 mb-6">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm capitalize">
                  {selectedRecipe.diet}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  ⏱️ {selectedRecipe.prepTime}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Ingredients
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  {selectedRecipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="text-gray-700">
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Preparation Steps
                </h3>
                <ol className="list-decimal pl-5 space-y-2">
                  {selectedRecipe.steps.map((step, index) => (
                    <li key={index} className="text-gray-700">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {showMealPlanner && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Add to Meal Plan
                  </h3>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addToMealPlan(e.target.value, selectedRecipe);
                      }
                    }}
                    className="w-full p-2 rounded border"
                  >
                    <option value="">Select a day...</option>
                    {daysOfWeek.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeExplorer;
