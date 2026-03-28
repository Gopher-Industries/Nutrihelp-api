  // components/WeeklyPlanView.jsx
import React from "react";
import "./FitnessJourney.css";

const WeeklyPlanView = ({
  fitnessData,
  visibleWeeks,
  selectedWeek,
  handleWeekClick,
  completedWeeks,
  handleCompleteWeek,
  points,
}) => {
  if (!fitnessData) {
    return <p>Loading fitness data...</p>;
  }

  const { weight, target_weight } = fitnessData;
  const currentWeight = parseFloat(weight);
  const goalWeight = parseFloat(target_weight);
  const totalChange = goalWeight - currentWeight;
  const weeks = 12;
  const weightChangePerWeek = totalChange / weeks;

  const fullPlan = Array.from({ length: weeks }, (_, i) => ({
    week: i + 1,
    goal: `Week ${i + 1}`,
    targetWeight: currentWeight + (i + 1) * weightChangePerWeek,
  }));

  const weeklyPlan = fullPlan.filter(
    (week) => !completedWeeks.includes(week.week)
  );

  return (
    <>
      <div className="weekly-plan">
        {weeklyPlan.slice(0, visibleWeeks).map((week) => (
          <div
            key={week.week}
            className={`week-plan ${selectedWeek?.week === week.week ? "selected" : ""}`}
            onClick={() => handleWeekClick(week)}
          >
            <h3>{week.goal}</h3>
            <p>Target Weight: {week.targetWeight.toFixed(2)} kg</p>
          </div>
        ))}
      </div>

      <div className="progress">
        {!selectedWeek ? (
          <p>your fitness training would be shown here</p>
        ) : (
          <div className="tips">
            <h3>{selectedWeek.goal}</h3>
            <p>Target: {selectedWeek.targetWeight.toFixed(2)} kg</p>
            <p>Tip: Stay consistent with your workouts and diet this week!</p>
            <button onClick={handleCompleteWeek}>Mark as Done ✅</button>
          </div>
        )}
      </div>
    </>
  );
};

export default WeeklyPlanView;
