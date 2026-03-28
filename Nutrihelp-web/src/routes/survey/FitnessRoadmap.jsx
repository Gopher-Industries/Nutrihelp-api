import React, { useEffect, useState } from 'react';
import './fitnessroadmap1.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';


export default function FitnessRoadmap() {
  const [data, setData] = useState(null);
  const [weekIndex, setWeekIndex] = useState(0);
  const [day, setDay] = useState('Monday');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unlockedWeek, setUnlockedWeek] = useState(0); // Week 1 unlocked by default

  const daysOfWeek = [
    'Monday','Tuesday','Wednesday',
    'Thursday','Friday','Saturday','Sunday'
  ];

  useEffect(() => {
    // Restore from localStorage if saved, else fetch from backend
    const cached = localStorage.getItem('FitnessPlan');
    if (cached) {
      setData(JSON.parse(cached));
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem('ObesityResult');
    if (!stored) {
      setError('⚠️ No medical report found. Please complete the questionnaire first.');
      setLoading(false);
      return;
    }
    const parsed = JSON.parse(stored);

    fetch('http://localhost:8000/ai-model/medical-report/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medical_report: parsed.medical_report,
        n_results: 3,
        max_tokens: 1200,
        temperature: 0.2,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((resp) => {
        setData(resp);
        localStorage.setItem('FitnessPlan', JSON.stringify(resp));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading plan…</p>;
  if (error) return <p>{error}</p>;
  if (!data) return null;

  const week = data.weekly_plan[weekIndex];

  // Convert ["Monday: walk", ...] into {Monday: "walk", ...}
  const dailyMap = {};
  week.workouts.forEach(item => {
  if (!item) return; // skip empty or undefined items
  const parts = item.split(':');
  if (parts.length < 2) return; // skip items without ":"
  
  const d = parts[0].trim();
  const details = parts[1].trim();
  dailyMap[d] = details;
});

  const workoutToday = dailyMap[day] || 'Rest day';

  // new part
  // --- Progress stats ---
const totalWeeks = data.weekly_plan.length;
const completedWeeks = unlockedWeek;
const currentWeek = data.weekly_plan[weekIndex];

// days in current week with an actual workout (not Rest)
const activeDaysThisWeek = currentWeek.workouts.filter(
  w => w && w.includes(':') && !w.toLowerCase().includes('rest')
).length;

// overall active days up to unlockedWeek
const overallActiveDays = data.weekly_plan
  .slice(0, unlockedWeek + 1)
  .reduce((sum, w) => (
    sum + w.workouts.filter(
      d => d && d.includes(':') && !d.toLowerCase().includes('rest')
    ).length
  ), 0);

const totalPossibleActiveDays = totalWeeks * 7;
const overallPercent = Math.round((overallActiveDays / totalPossibleActiveDays) * 100);

const ringsData = data.weekly_plan.map((w, i) => {
  // if user has unlocked week i, it's complete
  const isComplete = i < unlockedWeek;
  const isCurrent  = i === unlockedWeek;

  // Current week shows % of active workout days so far
  let value = 0;
  if (isComplete) value = 100;
  else if (isCurrent) {
    const active = w.workouts.filter(
      d => d && d.includes(':') && !d.toLowerCase().includes('rest')
    ).length;
    value = Math.round((active / 7) * 100);
  }

  return { week: w.week, value };
});

// end of it 

  return (
    
    <div className="roadmap-page">
      <div className="heading">
        <h1>Your Weekly Fitness Roadmap</h1>
      </div>

      {/* Week Selector */}
      <div className="selector-row">
        {data.weekly_plan.map((w, i) => {
          const isLocked = i > unlockedWeek;
          return (
            <div
              key={i}
              onClick={() => {
                if (!isLocked) {
                  setWeekIndex(i);
                  setDay('Monday');
                }
              }}
              className={`inline-block mb-3 cursor-pointer
                ${i === weekIndex ? 'week-card-active' : 'week-card-inactive'}
                ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Week {w.week} {isLocked && '🔒'}
            </div>
          );
        })}
      </div>

      {/* Day Selector */}
      <div className="day-buttons">
        {daysOfWeek.map((d) => (
          <button
            key={d}
            className={`day-btn ${d === day ? 'active' : ''}`}
            onClick={() => setDay(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        <div className="card-1">
          <div className="card">
            <h2>🏋️ Workout</h2>
            <p>{workoutToday}</p>
          </div>

          <div className="card">
            <h2>🥗 Focus</h2>
            <p><strong>Focus:</strong> {week.focus}</p>
          </div>
        </div>

        <div className="card">
          <h2>🥗 Nutrition</h2>
          <p><strong>Target Calories:</strong> {week.target_calories_per_day}</p>
          <p>{week.meal_notes}</p>
        </div>

        <div className="card">
          <h2>🔔 Reminders</h2>
          <ul>
            {week.reminders.map((r, idx) => <li key={idx}>{r}</li>)}
          </ul>
        </div>
      </div>
      

      {/* Unlock Next Week Button */}
      {weekIndex === unlockedWeek && unlockedWeek < data.weekly_plan.length - 1 && (
        <div className="roadmap-button">
          <button
            className="px-6 py-2 bg-green-600 text-white rounded-lg shadow
                       hover:bg-green-700 transition"
            onClick={() => setUnlockedWeek(unlockedWeek + 1)}
          >
            ✅ Done with Week {week.week} — Unlock Week {week.week + 1}
          </button>
        </div>
      )}

      {/* Progress & Stats Panel */}
      <div className="stats-panel">
        <h3>📊 Your Progress</h3>
        <p><strong>Weeks Completed:</strong> {completedWeeks} / {totalWeeks}</p>
        <p><strong>Active Days This Week:</strong> {activeDaysThisWeek} / 7</p>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${overallPercent}%` }} />
        </div>
        <p><strong>Total Completion:</strong> {overallPercent}%</p>
      </div>

      <div className="rings-wrapper">
            <h3>Weekly Progress</h3>
            <div className="rings-row">
              {ringsData.map((r, idx) => (
                <div key={idx} className="ring-item">
                  <CircularProgressbar
                    value={r.value}
                    text={`${r.value}%`}
                    styles={buildStyles({
                      pathColor: r.value === 100 ? '#4caf50' : '#7B44FF',
                      textColor: '#333',
                      trailColor: '#eee',
                    })}
                  />
                  <p>Week {r.week}</p>
                </div>
              ))}
            </div>
          </div>
    </div>
    
  );
}
