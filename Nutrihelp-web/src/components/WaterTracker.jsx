import React, { useState } from "react";
import "./WaterTracker.css";

const WaterTracker = () => {
  const [glasses, setGlasses] = useState(0);

  const increment = () => {
    if (glasses < 8) setGlasses(glasses + 1);
  };

  const decrement = () => {
    if (glasses > 0) setGlasses(glasses - 1);
  };

  return (
    <div className="water-tracker">
      <h3>Daily Water Intake</h3>
      <p>Track your water intake goal: 8 glasses/day</p>
      <div className="tracker-controls">
        <button onClick={decrement}>−</button>
        <span>{glasses} / 8</span>
        <button onClick={increment}>+</button>
      </div>
      <div className="glass-display">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className={`glass ${index < glasses ? "filled" : ""}`}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default WaterTracker;
