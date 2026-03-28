import React, { useState } from 'react'
import './../../../styles/auth.css'
import SubHeading from '../../../components/general_components/headings/SubHeading'
import './DietaryRequirements.css'

function UserPreference() {

  const [specialDietaryRequirements, setSpecialDietaryRequirements] = useState([])
  const [allergies, setAllergies] = useState([])
  const [dislikes, setDislikes] = useState([])
  const [healthConditions, setHealthConditions] = useState([])
  const [cuisine, setCuisine] = useState([])
  const [spiceLevel, setSpiceLevel] = useState([])
  const [cookingMethod, setCookingMethod] = useState([])

  const handleCloseClick = (index, value) => {
    if (index === 0) setSpecialDietaryRequirements(specialDietaryRequirements.filter(i => i !== value))
    if (index === 1) setAllergies(allergies.filter(i => i !== value))
    if (index === 2) setDislikes(dislikes.filter(i => i !== value))
    if (index === 3) setHealthConditions(healthConditions.filter(i => i !== value))
    if (index === 4) setCuisine(cuisine.filter(i => i !== value))
    if (index === 5) setSpiceLevel(spiceLevel.filter(i => i !== value))
    if (index === 6) setCookingMethod(cookingMethod.filter(i => i !== value))
  }

  const handleDropdownChange = (e, index) => {
    const value = e.target.value

    if (index === 0)
      specialDietaryRequirements.includes(value)
        ? setSpecialDietaryRequirements(specialDietaryRequirements.filter(i => i !== value))
        : setSpecialDietaryRequirements([...specialDietaryRequirements, value])

    if (index === 1)
      allergies.includes(value)
        ? setAllergies(allergies.filter(i => i !== value))
        : setAllergies([...allergies, value])

    if (index === 2)
      dislikes.includes(value)
        ? setDislikes(dislikes.filter(i => i !== value))
        : setDislikes([...dislikes, value])

    if (index === 3)
      healthConditions.includes(value)
        ? setHealthConditions(healthConditions.filter(i => i !== value))
        : setHealthConditions([...healthConditions, value])

    if (index === 4)
      cuisine.includes(value)
        ? setCuisine(cuisine.filter(i => i !== value))
        : setCuisine([...cuisine, value])

    if (index === 5)
      spiceLevel.includes(value)
        ? setSpiceLevel(spiceLevel.filter(i => i !== value))
        : setSpiceLevel([...spiceLevel, value])

    if (index === 6)
      cookingMethod.includes(value)
        ? setCookingMethod(cookingMethod.filter(i => i !== value))
        : setCookingMethod([...cookingMethod, value])
  }

  const handleRedoClick = () => {
    setSpecialDietaryRequirements([])
    setAllergies([])
    setDislikes([])
    setHealthConditions([])
    setCuisine([])
    setSpiceLevel([])
    setCookingMethod([])

    document.querySelectorAll('.dropdown select').forEach(s => {
      s.value = ''
    })
  }

  const handleConfirmClick = () => {

    const id = 1

    const preferencedata = {
      specialDietaryRequirements,
      allergies,
      dislikes,
      healthConditions,
      cuisine,
      spiceLevel,
      cookingMethod
    }

    fetch('https://localhost:443/api/userPreference', {
      method: 'POST',
      body: JSON.stringify({ id, preferencedata }),
      headers: {
        'Origin': 'http://localhost:3000/',
        'Content-Type': 'application/json'
      }
    })
      .then(() => {
        alert('User Preference selected successfully!')
        handleRedoClick()
      })
      .catch(() => {
        alert('Failed to send message. Please try again later.')
      })
  }

  return (
    <div className="preferences-container">

      <SubHeading text="Your Preferences" />

      <div className="select">
        <h4>Please confirm your selections</h4>
      </div>

      <div className="containerpre">

        <div className="group-title">Diet & Health</div>

        <div className="group-box">

          <div className="form-group">
            <h3>Special Dietary Requirements</h3>
            <div className="dropdown">
              <select onChange={(e) => handleDropdownChange(e, 0)}>
                <option value="">Select an option</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Gluten-free">Gluten-free</option>
              </select>

              {specialDietaryRequirements.map((v, i) => (
                <div key={i} className="selected-option">
                  {v}
                  <img src="./images/close.png" className="close-icon"
                    onClick={() => handleCloseClick(0, v)} />
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <h3>Allergies</h3>
            <div className="dropdown">
              <select onChange={(e) => handleDropdownChange(e, 1)}>
                <option value="">Select an option</option>
                <option value="Dairy">Dairy</option>
                <option value="Eggs">Eggs</option>
                <option value="Nuts">Nuts</option>
              </select>

              {allergies.map((v, i) => (
                <div key={i} className="selected-option">
                  {v}
                  <img src="./images/close.png" className="close-icon"
                    onClick={() => handleCloseClick(1, v)} />
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <h3>Health Conditions</h3>
            <div className="dropdown">
              <select onChange={(e) => handleDropdownChange(e, 3)}>
                <option value="">Select an option</option>
                <option value="Vitamin B6 deficiency">Vitamin B6 deficiency</option>
                <option value="Vitamin D deficiency">Vitamin D deficiency</option>
                <option value="Limit Sodium 2400mg">Limit Sodium 2400mg</option>
                <option value="Limit Cholesterol 2800mg">Limit Cholesterol 2800mg</option>
              </select>

              {healthConditions.map((v, i) => (
                <div key={i} className="selected-option">
                  {v}
                  <img src="./images/close.png" className="close-icon"
                    onClick={() => handleCloseClick(3, v)} />
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="group-title">Taste Preferences</div>

        <div className="group-box">

          <div className="form-group">
            <h3>Dislikes</h3>
            <div className="dropdown">
              <select onChange={(e) => handleDropdownChange(e, 2)}>
                <option value="">Select an option</option>
                <option value="Ginger">Ginger</option>
                <option value="Mushrooms">Mushrooms</option>
                <option value="Onions">Onions</option>
              </select>

              {dislikes.map((v, i) => (
                <div key={i} className="selected-option">
                  {v}
                  <img src="./images/close.png" className="close-icon"
                    onClick={() => handleCloseClick(2, v)} />
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <h3>Choice of Cuisine</h3>
            <div className="dropdown">
              <select onChange={(e) => handleDropdownChange(e, 4)}>
                <option value="">Select an option</option>
                <option value="Italian">Italian</option>
                <option value="Chinese">Chinese</option>
                <option value="Indian">Indian</option>
              </select>

              {cuisine.map((v, i) => (
                <div key={i} className="selected-option">
                  {v}
                  <img src="./images/close.png" className="close-icon"
                    onClick={() => handleCloseClick(4, v)} />
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <h3>Level of Spice</h3>
            <div className="dropdown">
              <select onChange={(e) => handleDropdownChange(e, 5)}>
                <option value="">Select an option</option>
                <option value="Mild">Mild</option>
                <option value="Medium">Medium</option>
                <option value="Spicy">Spicy</option>
              </select>

              {spiceLevel.map((v, i) => (
                <div key={i} className="selected-option">
                  {v}
                  <img src="./images/close.png" className="close-icon"
                    onClick={() => handleCloseClick(5, v)} />
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <h3>Method of Cooking</h3>
            <div className="dropdown">
              <select onChange={(e) => handleDropdownChange(e, 6)}>
                <option value="">Select an option</option>
                <option value="Grilled">Grilled</option>
                <option value="Baked">Baked</option>
                <option value="Fried">Fried</option>
              </select>

              {cookingMethod.map((v, i) => (
                <div key={i} className="selected-option">
                  {v}
                  <img src="./images/close.png" className="close-icon"
                    onClick={() => handleCloseClick(6, v)} />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      <div className="buttonpre">
        <button className="btn-pre" onClick={handleConfirmClick}>
          CONFIRM CHOICES
        </button>
      </div>

      <div className="buttonre">
        <button className="btn-redo" onClick={handleRedoClick}>
          REDO
        </button>
      </div>

    </div>
  )
}

export default UserPreference
