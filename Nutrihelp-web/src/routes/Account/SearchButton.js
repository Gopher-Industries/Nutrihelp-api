import { useState } from "react";
import "./SearchButton.css";

function SearchButton({ onSearch }) {
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState("");

  const handleSearchClick = () => {
    onSearch(userId, date);
  };

  return (
    <div className="col-lg-12 titleInput">
      <div className="SearchButton">
        <div className="input">
          <input
            type="text"
            placeholder="please input user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <div className="link"></div>
        </div>
        <div className="search" onClick={handleSearchClick}>
          Search
        </div>
        <div className="date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default SearchButton;
