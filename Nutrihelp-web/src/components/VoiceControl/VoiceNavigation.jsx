import React from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
 
const VoiceNavigation = () => {
  const navigate = useNavigate();
  const commands = [
    { keywords: ["home"], path: "/home" },
    { keywords: ["login", "sign in"], path: "/login" },
    { keywords: ["sign up", "register"], path: "/signUp" },
    { keywords: ["forgot", "reset password"], path: "/forgotPassword" },
    { keywords: ["faq", "questions", "help"], path: "/faq" },
    { keywords: ["create", "add recipe"], path: "/createRecipe" },
    { keywords: ["search", "find recipe"], path: "/searchRecipes" },
    { keywords: ["preferences"], path: "/yourPreferences" },
    { keywords: ["profile", "user"], path: "/userProfile" },
    { keywords: ["appointment", "booking"], path: "/Appointment" },
    { keywords: ["dietary", "requirements"], path: "/dietaryRequirements" },
    { keywords: ["scan", "barcode", "product"], path: "/ScanProducts" },
    { keywords: ["menu", "workout"], path: "/menu" },
    { keywords: ["recipe", "recipes"], path: "/recipe" },
    { keywords: ["meal", "track meal"], path: "/meal" },
    { keywords: ["nutrition", "calculator"], path: "/nutrition-calculator" },
    { keywords: ["view"], path: "/dashboard" },
    {
      keywords: ["logout", "log out", "sign out"],
      action: () => {
        console.log(" Voice command matched: logout");
   
        const button = document.querySelector("button.logout-button");
   
        if (button) {
          console.log("Logout button found. Dispatching real click event...");
   
          const clickEvent = new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
            composed: true
          });
   
          button.dispatchEvent(clickEvent);
        } else {
          console.warn("Logout button not found.");
        }
      }
    }
   
  ];
 
  const handleVoiceCommand = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }
 
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
 
    recognition.start();
 
    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript.toLowerCase().trim().replace(/[^\w\s]/gi, "");
      console.log("You said:", spokenText);
   
      let found = false;
      for (const cmd of commands) {
        for (const keyword of cmd.keywords) {
          if (spokenText.includes(keyword)) {
            if (cmd.action) {
              cmd.action();
            } else if (cmd.path) {
              navigate(cmd.path);
            }
            found = true;
            return;
          }
        }
      }
   
      if (!found) {
        alert(`Sorry, I didn't understand: "${spokenText}"`);
      }
    };
   
 
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };
  };
 
  const micButton = (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        zIndex: 9999,
        pointerEvents: "auto",
      }}
    >
      <button
        onClick={handleVoiceCommand}
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          padding: "1rem",
          borderRadius: "50%",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
          fontSize: "1.5rem",
          cursor: "pointer",
          border: "none",
        }}
        title="Click to speak"
      >
        🎤
      </button>
    </div>
  );
 
  return ReactDOM.createPortal(micButton, document.body);
};
 
export default VoiceNavigation;
 
 