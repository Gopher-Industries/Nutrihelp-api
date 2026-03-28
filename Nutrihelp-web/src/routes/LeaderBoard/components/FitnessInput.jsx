// import React, { useState } from "react";
// import "./FitnessInput.css"; // Assuming you've kept the existing styles in this file

// const FitnessInput = ({ onProfileSaved }) => {
//   const [currentFitness, setCurrentFitness] = useState({
//     weight: "",
//     height: "",
//     bodyType: "",
//   });
//   const [targetFitness, setTargetFitness] = useState({
//     targetWeight: "",
//     endGoal: "",
//   });
//   const [currentStep, setCurrentStep] = useState(1); // Step control (1 = current, 2 = target)

//   // Handle current fitness input change
//   const handleCurrentInputChange = (e) => {
//     const { name, value } = e.target;
//     setCurrentFitness({
//       ...currentFitness,
//       [name]: value,
//     });
//   };

//   // Handle target fitness input change
//   const handleTargetInputChange = (e) => {
//     const { name, value } = e.target;
//     setTargetFitness({
//       ...targetFitness,
//       [name]: value,
//     });
//   };

//   // Handle form submission
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (currentStep === 1) {
//       setCurrentStep(2); // Move to target goal input
//     } else {
//       alert("Form submitted!");
//       // Process the data here (send to backend or store in state)
//       onProfileSaved();
//     }
//   };

//   return (
//     <div className="fitness-form-container">

//       <form onSubmit={handleSubmit}>
        
//         {/* Step 1: Current Fitness */}
//         {currentStep === 1 && (
          
//           <div className="current-fitness-form">
//             <h2>Personalize Your Health Tracker</h2>
//             <div className="form-group">
//               <label>Current Weight (kg):</label>
//               <input
//                 type="number"
//                 name="weight"
//                 value={currentFitness.weight}
//                 onChange={handleCurrentInputChange}
//                 className="form-input"
//               />
//             </div>
//             <div className="form-group">
//               <label>Current Height (cm):</label>
//               <input
//                 type="number"
//                 name="height"
//                 value={currentFitness.height}
//                 onChange={handleCurrentInputChange}
//                 className="form-input"
//               />
//             </div>
//             <div className="form-group">
//               <label>Body Type:</label>
//               <select
//                 name="bodyType"
//                 value={currentFitness.bodyType}
//                 onChange={handleCurrentInputChange}
//                 className="form-input"
//               >
//                 <option value="">Select Body Type</option>
//                 <option value="Ectomorph">Ectomorph (Lean)</option>
//                 <option value="Mesomorph">Mesomorph (Muscular)</option>
//                 <option value="Endomorph">Endomorph (Rounder)</option>
//               </select>
//             </div>
//             <button type="submit" className="next-button">Next: Set Target Goal</button>
//           </div>
//         )}

//         {/* Step 2: Target Goal */}
//         {currentStep === 2 && (
//           <div className="target-goal-form">
//             <h3>What is your target goal?</h3>

//             {/* Question 1: Target Weight */}
//             <div className="form-group">
//               <label>Target Weight (kg):</label>
//               <input
//                 type="number"
//                 name="targetWeight"
//                 value={targetFitness.targetWeight}
//                 onChange={handleTargetInputChange}
//                 className="form-input"
//               />
//             </div>

//             {/* Question 2: End Goal */}
//             <div className="form-group">
//               <label>End Goal:</label>
//               <select
//                 name="endGoal"
//                 value={targetFitness.endGoal}
//                 onChange={handleTargetInputChange}
//                 className="form-input"
//               >
//                 <option value="">Select End Goal</option>
//                 <option value="Gain Muscle">Gain Muscle</option>
//                 <option value="Gain Weight">Gain Weight</option>
//                 <option value="Lose Weight">Lose Weight</option>
//                 <option value="Maintain">Maintain Weight</option>
//                 <option value="Healthy Schedule">Just a Healthy Schedule</option>
//               </select>
//             </div>

//             <button type="submit" className="submit-button">Submit</button>
//           </div>
//         )}
//       </form>
//     </div>
//   );
// };

// export default FitnessInput;


import React, { useState } from "react";
import "./FitnessInput.css"; // Assuming you've kept the existing styles in this file

const FitnessInput = ({ onProfileSaved }) => {
  const [currentFitness, setCurrentFitness] = useState({
    weight: "",
    height: "",
    bodyType: "",
  });
  const [targetFitness, setTargetFitness] = useState({
    targetWeight: "",
    endGoal: "",
  });
  const [currentStep, setCurrentStep] = useState(1); // Step control (1 = current, 2 = target)

  // Handle current fitness input change
  const handleCurrentInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentFitness({
      ...currentFitness,
      [name]: value,
    });
  };

  // Handle target fitness input change
  const handleTargetInputChange = (e) => {
    const { name, value } = e.target;
    setTargetFitness({
      ...targetFitness,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentStep === 1) {
      setCurrentStep(2); // Move to target goal input
    } else {
      // Prepare the data to be sent to the backend
      const data = {
        weight: currentFitness.weight,
        height: currentFitness.height,
        bodyType: currentFitness.bodyType,
        targetWeight: targetFitness.targetWeight,
        endGoal: targetFitness.endGoal,
      };

      // Send the data to the backend API using fetch
      try {
        const response = await fetch("https://localhost:443/api/fitness-journey", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      
        const result = await response.json();
      
        if (response.ok) {
          alert("Fitness journey saved successfully!");
          onProfileSaved(); // If you want to redirect or show something
        } else {
          alert(`Error: ${result?.error || "Something went wrong"}`);
        }
      } catch (error) {
        alert(`Network error: ${error.message}`);
      }
      
    }
  };

  return (
    <div className="fitness-form-container">
      <form onSubmit={handleSubmit}>
        {/* Step 1: Current Fitness */}
        {currentStep === 1 && (
          <div className="current-fitness-form">
            <h2>Personalize Your Health Tracker</h2>
            <div className="form-group">
              <label>Current Weight (kg):</label>
              <input
                type="number"
                name="weight"
                value={currentFitness.weight}
                onChange={handleCurrentInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Current Height (cm):</label>
              <input
                type="number"
                name="height"
                value={currentFitness.height}
                onChange={handleCurrentInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Body Type:</label>
              <select
                name="bodyType"
                value={currentFitness.bodyType}
                onChange={handleCurrentInputChange}
                className="form-input"
              >
                <option value="">Select Body Type</option>
                <option value="Ectomorph">Ectomorph (Lean)</option>
                <option value="Mesomorph">Mesomorph (Muscular)</option>
                <option value="Endomorph">Endomorph (Rounder)</option>
              </select>
            </div>
            <button type="submit" className="next-button">
              Next: Set Target Goal
            </button>
          </div>
        )}

        {/* Step 2: Target Goal */}
        {currentStep === 2 && (
          <div className="target-goal-form">
            <h3>What is your target goal?</h3>

            {/* Question 1: Target Weight */}
            <div className="form-group">
              <label>Target Weight (kg):</label>
              <input
                type="number"
                name="targetWeight"
                value={targetFitness.targetWeight}
                onChange={handleTargetInputChange}
                className="form-input"
              />
            </div>

            {/* Question 2: End Goal */}
            <div className="form-group">
              <label>End Goal:</label>
              <select
                name="endGoal"
                value={targetFitness.endGoal}
                onChange={handleTargetInputChange}
                className="form-input"
              >
                <option value="">Select End Goal</option>
                <option value="Gain Muscle">Gain Muscle</option>
                <option value="Gain Weight">Gain Weight</option>
                <option value="Lose Weight">Lose Weight</option>
                <option value="Maintain">Maintain Weight</option>
                <option value="Healthy Schedule">Just a Healthy Schedule</option>
              </select>
            </div>

            <button type="submit" className="submit-button">Submit</button>
          </div>
        )}
      </form>
    </div>
  );
};

export default FitnessInput;
