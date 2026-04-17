
// import React, { useState, useEffect } from "react";
// import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
// import { Home, BarChart2, PieChart as PieIcon } from "lucide-react";
// import "./FitnessJourney.css";

// const FitnessJourney = () => {
//   const [fitnessData, setFitnessData] = useState(null);
//   const [visibleWeeks, setVisibleWeeks] = useState(12); // Start with Week 1
//   const [selectedWeek, setSelectedWeek] = useState(null);
//   const [completedWeeks, setCompletedWeeks] = useState([]);
//   const [points, setPoints] = useState(0);
//   const [activePage, setActivePage] = useState("weekly");

//   useEffect(() => {
//     const fetchFitnessData = async () => {
//       try {
//         const res = await fetch("https://localhost:443/api/fitness-Journey");
//         const data = await res.json();
//         setFitnessData(Array.isArray(data) ? data[data.length - 1] : data);
//       } catch (error) {
//         console.error("Error fetching fitness data:", error);
//       }
//     };

//     fetchFitnessData();
//   }, []);

//   const generateWeeklyPlan = () => {
//     if (!fitnessData) return [];

//     const { weight, target_weight } = fitnessData;
//     const currentWeight = parseFloat(weight);
//     const goalWeight = parseFloat(target_weight);

//     if (isNaN(currentWeight) || isNaN(goalWeight)) return [];

//     const totalChange = goalWeight - currentWeight;
//     const weeks = 12;
//     const weightChangePerWeek = totalChange / weeks;

//     return Array.from({ length: weeks }, (_, i) => ({
//       week: i + 1,
//       goal: `Week ${i + 1}`,
//       targetWeight: currentWeight + (i + 1) * weightChangePerWeek,
//     }));
//   };

//   const weeklyPlan = generateWeeklyPlan().filter(
//     (week) => !completedWeeks.includes(week.week)
//   );

//   const handleWeekClick = (week) => {
//     setSelectedWeek(week);
//   };

//   const handleCompleteWeek = () => {
//     if (selectedWeek && !completedWeeks.includes(selectedWeek.week)) {
//       setCompletedWeeks([...completedWeeks, selectedWeek.week]);
//       setPoints(points + 10);
//       setSelectedWeek(null);
//     }
//   };

//   return (
//     <div className="fitness-journey">
//       <div className="score">
//         <p>Your Fitness Journey</p>
//         <div className="">⭐ {points} pts</div>
//       </div>
//       <div className="feature-picker">
//         <Home onClick={() => setActivePage("weekly")} />
//         <BarChart2 onClick={() => setActivePage("progress")} />
//         <PieIcon onClick={() => setActivePage("stats")} />
//       </div>
//       {!fitnessData ? (
//         <p>Loading fitness data...</p>
//       ) : (
//         <div className="weekly-plan">
//           {weeklyPlan.slice(0, visibleWeeks).map((week) => (
//             <div
//               key={week.week}
//               className={`week-plan ${selectedWeek?.week === week.week ? "selected" : ""}`}
//               onClick={() => handleWeekClick(week)}
//             >
//               <h3>{week.goal}</h3>
//               <p>Target Weight: {week.targetWeight.toFixed(2)} kg</p>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* {selectedWeek && ( */}
//         <div className="progress">
//           {!selectedWeek ? (
//             <p>your fitness training would be shown here</p>
//           ):(
//           <div className="tips">
//             <h3>{selectedWeek.goal}</h3>
//             <p>Target: {selectedWeek.targetWeight.toFixed(2)} kg</p>
//             <p>Tip: Stay consistent with your workouts and diet this week!</p>
//             <button onClick={handleCompleteWeek}>Mark as Done ✅</button>
//           </div>         
//           )}
//         </div>
//     </div>
//   );
// };

// export default FitnessJourney;


// FitnessJourney.jsx
import React, { useState, useEffect } from "react";
import { Home, BarChart2, PieChart as PieIcon } from "lucide-react";
import WeeklyPlanView from "./WeeklyPlanView.jsx"; // adjust path as needed
import StatsView from "./StatsView.jsx";
import "./FitnessJourney.css";

const FitnessJourney = () => {
  const [fitnessData, setFitnessData] = useState(null);
  const [visibleWeeks, setVisibleWeeks] = useState(12);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [completedWeeks, setCompletedWeeks] = useState([]);
  const [points, setPoints] = useState(0);
  const [activePage, setActivePage] = useState("weekly");

  useEffect(() => {
    const fetchFitnessData = async () => {
      try {
        const res = await fetch("https://localhost:443/api/fitness-Journey");
        const data = await res.json();
        setFitnessData(Array.isArray(data) ? data[data.length - 1] : data);
      } catch (error) {
        console.error("Error fetching fitness data:", error);
      }
    };

    fetchFitnessData();
  }, []);

  const handleWeekClick = (week) => {
    setSelectedWeek(week);
  };

  const handleCompleteWeek = () => {
    if (selectedWeek && !completedWeeks.includes(selectedWeek.week)) {
      setCompletedWeeks([...completedWeeks, selectedWeek.week]);
      setPoints(points + 10);
      setSelectedWeek(null);
    }
  };

  return (
    <div className="fitness-journey">
      <div className="score">
        <p>Your Fitness Journey</p>
        <div className="">⭐ {points} pts</div>
      </div>

      <div className="feature-picker">
        <div
          className={`feature-icon ${activePage === "weekly" ? "active" : ""}`}
          onClick={() => setActivePage("weekly")}
        >
          <Home />
        </div>
        <div
          className={`feature-icon ${activePage === "stats" ? "active" : ""}`}
          onClick={() => setActivePage("stats")}
        >
          <PieIcon />
        </div>
        <div
          className={`feature-icon ${activePage === "progress" ? "active" : ""}`}
          onClick={() => setActivePage("progress")}
        >
          <BarChart2 />
        </div>
        
      </div>

      {/* Conditional rendering based on activePage */}
      {activePage === "weekly" && (
        <WeeklyPlanView
          fitnessData={fitnessData}
          visibleWeeks={visibleWeeks}
          selectedWeek={selectedWeek}
          handleWeekClick={handleWeekClick}
          completedWeeks={completedWeeks}
          handleCompleteWeek={handleCompleteWeek}
          points={points}
        />
      )}

      {activePage === "progress" && <p>Progress feature coming soon...</p>}
      {activePage === "stats" && (
        <StatsView fitnessData={fitnessData} completedWeeksCount={completedWeeks.length} />
      )}
    </div>
  );
};

export default FitnessJourney;

