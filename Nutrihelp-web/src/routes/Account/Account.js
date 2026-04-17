import { useState, useEffect } from "react";
import "./Account.css";
import ShowStar from "./ShowStar";
import SearchButton from "./SearchButton";

function Account() {
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mealDataList, setMealDataList] = useState([]);
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState(""); 

  useEffect(() => {
    const fetchMealData = async () => {
      try {
        const params = new URLSearchParams();
        if (userId) params.append('user_id', userId);
        if (date) params.append('created_at', date);

        const response = await fetch(`https://localhost:443/api/account?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch meal plan data");
        }

        const fetchedData = await response.json();
        const formattedData = fetchedData.map((mealData) => ({
          title: mealData.meal_type,
          date: formatDate(mealData.created_at),
          meals: [
            {
              name: mealData.meal_type,
              ingredients: mealData.recipes
            }
          ],
          star: 3
        }));

        setMealDataList(formattedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchMealData();
  }, [userId, date]);

  function formatDate(dateString) {
    const date = new Date(dateString);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  const [isTime, setTime] = useState(null);

  const handleMealClick = (title, star) => {
    setSelectedMeal({ title, star });
    setIsVisible(true);

    if (isTime) {
      clearTimeout(isTime);
    }

    const newTimeoutId = setTimeout(() => {
      setIsVisible(false);
      setSelectedMeal(null);
    }, 5000);

    setTime(newTimeoutId);
  };

  const handleSearch = (userId, date) => {
    setUserId(userId);
    setDate(date);
  };

  return (
    <div id="account">
      <div className="container">
        <div className="row">
          <SearchButton onSearch={handleSearch} />
        </div>
        {mealDataList.map((mealData, index) => (
          <MealPlan
            key={index}
            title={mealData.title}
            date={mealData.date}
            meals={mealData.meals}
            star={mealData.star}
            onMealClick={handleMealClick}
          />
        ))}
      </div>
      {selectedMeal && (
        <ShowStar
          title={selectedMeal.title}
          star={selectedMeal.star}
          isVisible={isVisible}
        />
      )}
    </div>
  );
}

function MealPlan({ title, date, meals, star, onMealClick }) {
  return (
    <div className="row">
      <div className="col-lg-12 account">
        <div
          className="col-lg-12 title"
          onClick={() => onMealClick(title, star)}
        >
          <h3>{title}</h3>
          <p>{date}</p>
        </div>
        <hr />
        {meals.map((meal, index) => (
          <div key={index} className="col-lg-12 message">
            <div className="left">
              <h5>{meal.name}</h5>
            </div>
            <div className="right">
              <p>Ingredients</p>
              <ul>
                {meal.ingredients.map((ingredient, idx) => (
                  <li key={idx}>{ingredient}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Account;
