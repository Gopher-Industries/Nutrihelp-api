import React, { useEffect } from 'react';
import './FeedbackPopup.css';

function FeedbackPopup({ rating, tags, onClose }) {

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const generateAdvice = () => {
    if (rating <= 2.0) {
      if (tags.includes('High Fat')) {
        return "Consider reducing the fat content and increasing the proportion of vegetables";
      } else if (tags.includes('High Salt')) {
        return "It is recommended to reduce the salt content and use natural spices for seasoning";
      } else if (tags.includes('Low Protein') || tags.some(tag => tag.includes('Protein'))) {
        return "Consider increasing protein intake and adding beans or lean meat";
      } else if (tags.includes('Low Calorie')) {
        return "It is recommended to increase healthy fats and complex carbohydrates, such as avocados and whole grains";
      } else {
        return "It is recommended to increase the content of dietary fiber and vitamins and add more fresh fruits and vegetables";
      }
    }
    return null;
  };

  const advice = generateAdvice();

  if (!advice) return null;

  return (
    <div className="feedback-popup-overlay" onClick={onClose}>
      <div className="feedback-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h3>Suggestions for recipe optimization ..</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="popup-body">
          <div className="advice-icon">💡</div>
          <p className="advice-text">{advice}</p>
        </div>
        <div className="popup-footer">
          <button className="action-btn" onClick={onClose}>Application suggestions</button>
        </div>
      </div>
    </div>
  );
}

export default FeedbackPopup;