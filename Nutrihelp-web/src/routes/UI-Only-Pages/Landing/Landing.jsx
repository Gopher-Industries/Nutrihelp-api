
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';


import './landing.css';
import { UserContext } from "../../../context/user.context";

const Landing = () => {
  return (
    <>
      <div className="landing-container">
        <div className="logo-and-menu">
          <img src="./images/logo.png" alt="NutriHelp Logo" className="logo" />
          <div className="menu">
            <div className="menu-item">
              <span>About Us</span>
            </div>
            <div className="menu-item">
              <span>Contact Us</span>
            </div>
            <button className="action-button">Sign Up</button>
            <button className="action-button">Login</button>
          </div>
        </div>
        <div className="content-container">
          <div className="label1">
            <div className="text-wrapper1">NutriHelp™</div>
          </div>
          <div className="label2">
            <p className="text-wrapper2">The right way to track a healthy Life.</p>
          </div>
          <div className="label3">
            <p className="text-wrapper3">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
              magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
              consequat. Duis aute irure dolor in.
            </p>
          </div>
          <div className="label4">
            <div className="text-wrapper4"> To download, Visit</div>
          </div>
          <div className="image">
            <img className="img" alt="Image" src="./images/pic1.png" />
          </div>
        </div>
        <div className="image">
          <img src="./images/containerx.png" alt="Image" className="img" />
        </div>

      </div>
    </>
  );
};

export default Landing;

