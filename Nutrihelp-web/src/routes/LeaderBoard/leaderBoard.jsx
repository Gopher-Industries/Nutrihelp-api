// src/routes/Leaderboard/Leaderboard.jsx
import React, { useState } from "react";
import FitnessInput from "./components/FitnessInput";
import FitnessJourney from "./components/FitnessJourney";
import "./leaderBoard.css"; // Make sure this is imported

const Leaderboard = () => {
  const [hasProfile, setHasProfile] = useState(false); // Simulate backend check

  return (
    <div className="leaderboard-background">
      <div className="leaderboard-page">
        {!hasProfile ? (
          <FitnessInput onProfileSaved={() => setHasProfile(true)} />
        ) : (
          <FitnessJourney/>
        )}
        {/* <FitnessJourney 
          currentWeight={65} // Example weight
          targetWeight={55}  // Example target weight
          goalType="Lose weight" // Example goal type
        /> */}
      </div>
    </div>
  );
};

export default Leaderboard;
