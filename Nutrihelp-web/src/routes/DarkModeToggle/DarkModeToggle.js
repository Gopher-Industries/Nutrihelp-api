import { MoonIcon, SunIcon } from "lucide-react";
import React, { useEffect } from "react";
import { useDarkMode } from "./DarkModeContext";
import "./DarkModeToggle.css";

const DarkModeToggle = () => {
  const { darkMode, setDarkMode } = useDarkMode();
  console.log("🚀 ~ DarkModeToggle ~ darkMode:", darkMode);

  const handleClick = () => {
    document.documentElement.classList.toggle("dark-mode", !darkMode);
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark-mode");

    if (isDarkMode !== darkMode) {
      setDarkMode(isDarkMode);
    }
  }, []);

  return (
    <button
      onClick={handleClick}
      style={{
        borderRadius: "50%",
      }}
      aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
    >
      {darkMode ? <SunIcon size={24} /> : <MoonIcon size={24} />}
    </button>
  );
};

export default DarkModeToggle;
