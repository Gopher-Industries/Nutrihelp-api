import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import './predictionresult.css';

export default function ObesityResult() {
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fitnessChoice, setFitnessChoice] = useState(null); // "yes" | "no" | null
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Read result from localStorage
    const stored = localStorage.getItem('ObesityResult');
    if (stored) {
      const parsed = JSON.parse(stored);
      setResult(parsed.medical_report); // extract nested object
    }
  }, []);

  const handleDownloadPDF = () => {
    if (!resultRef.current) return;
    html2pdf().from(resultRef.current).save('Obesity_Report.pdf');
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('🔗 Link copied to clipboard!');
    });
  };

  return (
    <div className="full">
      {/* <div className="prediction-result-card" ref={resultRef}> */}
      <div className="prediction-heading">
        🎯 Your Health Report
      </div>
        {result ? (
          <div className="result-info">
            <div className="outcome">
                <div className="result-item">
                <span className="result-label">⚖️ Obesity Level:</span>
                <span className="result-value">
                  {result.obesity_prediction.obesity_level} (
                  {(result.obesity_prediction.confidence * 100).toFixed(1)}% confidence)
                </span>
              </div>

              <div className="result-item">
                <span className="result-label">🩺 Diabetes Risk:</span>
                <span className="result-value">
                  {result.diabetes_prediction.diabetes ? 'Positive' : 'Negative'} (
                  {(result.diabetes_prediction.confidence * 100).toFixed(1)}% confidence)
                </span>
              </div>
            </div>
              <div className="result-buttons">
                <button className="save-btton" onClick={handleDownloadPDF}>
                  📄 Save as PDF
                </button>
                <button className="copy-btn" onClick={handleCopyLink}>
                  🔗 Copy Share Link
                </button>
                <Link to="/survey">
                  <button className="back-btn">← Back to Questionnaire</button>
                </Link>
              </div>
          </div>
        ) : (
          <p>No result data available.</p>
        )}

            <div className="fitness-question">
              {fitnessChoice === null && (
                <>
                  💪 Do you want to start your fitness journey?
                  <div className="choice-buttons">
                    <button onClick={() => setFitnessChoice('yes')}>✅ Yes</button>
                    <button onClick={() => setFitnessChoice('no')}>❌ No</button>
                  </div>
                </>
              )}

              {fitnessChoice === 'yes' && (
                <div className="followup-questions">
                  <p>Great! Let’s get started 🚀</p>
                  <label>
                    1️⃣ What is your target weight?
                    <input type="text" placeholder="(kG)" />
                  </label>
                  <label>
                    2️⃣ How many days a week can you exercise?
                    <input type="number" placeholder="e.g., 3" />
                  </label>
                  <label>
                    3️⃣ Do you prefer home workouts or gym?
                    <select>
                      <option>Home</option>
                      <option>Gym</option>
                      <option>Both</option>
                    </select>
                  </label>
                  <button className="start-btn" onClick={() => navigate('/roadmap')}>🚀 Start Journey</button>
                </div>
              )}

              {fitnessChoice === 'no' && (
                <div className="no-journey">
                  <p>That’s okay 👍 You can always start later.</p>
                  <button onClick={() => navigate('/home')}>🏠 Go to Home</button>
                </div>
              )}
            </div>
       
    </div>
  );
}
