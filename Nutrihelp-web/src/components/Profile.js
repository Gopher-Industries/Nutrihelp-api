import React from 'react';
import '../styles/auth.css';
function SignUpComponent() {
  return (
    <div className="main">
      <section className="signup">
        <div className="container">
          <div className="signup-content">
            <div className="signup-form">
              <h2 className="form-title">Profile</h2>
              <form method="POST" className="register-form">
                <div className="form-group">
                  <input type="text" name="name" placeholder="First Name" />
                </div>
                <div className="form-group">
                  <input type="text" name="name" placeholder="Last Name" />
                </div>
                <div className="form-group">
                  <input type="text" name="age" id="age" placeholder="Age" />
                </div>
                <div className="form-group">
                  <select name="pass" id="pass">
                    <option value="">Gender</option>
                    <option value="Input1">Male</option>
                    <option value="Input2">Female</option>
                    <option value="Input3">Transgender</option>
                  </select>
                </div>
                <div className="form-group">
                  <input type="text" name="height" id="height" placeholder="Height (cm)" />
                </div>
                <div className="form-group">
                  <input type="text" name="weight" id="weight" placeholder="Weight (kg)" />
                </div>
                <div className="form-group form-button">
                  <input type="submit" name="continue" className="form-submit" value="Continue" />
                </div>
              </form>
            </div>
            <div className="signup-image">
              <img src="images/1.png" alt="Profile" />
              <hr />
              <h3>Accessibility</h3>
              <p>Text Size</p>
              <button className="optbuttons">Normal</button>
              <button className="optbuttons" style={{ marginLeft: '5px' }}>Large</button>
              <div className="form-group">
                <hr />
                <p>Select all applicable</p>
                <button className="sel">Color Blind</button>
                <button className="sel">Voice Over</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="signup">
        <div className="container">
          <div className="signup-content">
            <div className="signup-form">
              <h2 className="form-title">Access</h2>
              <form method="POST" className="register-form">
                <div className="form-group" id="sd">
                  <div className="searchable-dropdown">
                    <input type="text" id="search-input" placeholder="Search Contact" />
                    <ul id="dropdown-list">
                      <li id="option-1" data-value="1">Contact 1</li>
                      <hr />
                      <li data-value="2">Contact 2</li>
                      <hr />
                      <li data-value="3">Contact 3</li>
                      <hr />
                      <li data-value="4">Contact 4</li>
                    </ul>
                  </div>
                </div>
                <div className="form-group">
                  <div className="toggle-container">
                    <h3>Family / Carer</h3>
                    <label className="switch">
                      <input type="checkbox" />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-container">
                    <h3>Weekly Reports</h3>
                    <label className="switch">
                      <input type="checkbox" />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-container">
                    <h3>Health Report</h3>
                    <label className="switch">
                      <input type="checkbox" />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-container">
                    <h3>Grocery List</h3>
                    <label className="switch">
                      <input type="checkbox" />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                <h2 className="form-title">Notifications</h2>
                <div className="toggle-container">
                  <h3>Notification</h3>
                  <label className="switch">
                    <input type="checkbox" />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="toggle-container">
                  <h3>Notification</h3>
                  <label className="switch">
                    <input type="checkbox" />
                    <span className="slider"></span>
                  </label>
                </div>
                <div>
                  <div className="toggle-container">
                    <h3>Notification</h3>
                    <label className="switch">
                      <input type="checkbox" />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-container">
                    <h3>Notification</h3>
                    <label className="switch">
                      <input type="checkbox" />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                <div className="form-group form-button">
                  <input type="submit" name="continue" className="form-submit" value="Continue" />
                </div>
              </form>
            </div>
            <div className="signup-image">
              <img src="/images/1.png" alt="Access" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SignUpComponent;
