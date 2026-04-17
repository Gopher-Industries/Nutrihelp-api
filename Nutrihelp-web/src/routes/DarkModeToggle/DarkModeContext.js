import { createContext, useContext, useEffect, useState } from "react";

// Create Dark Mode Context
const DarkModeContext = createContext();

// Context Provider Component
export const DarkModeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" || 
    localStorage.getItem("globalDarkMode") === "true"
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark-mode");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem("darkMode", darkMode);
    localStorage.setItem("globalDarkMode", darkMode); // Keep in sync with Settings
  }, [darkMode]);

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

// Custom Hook to use Dark Mode Context
export const useDarkMode = () => useContext(DarkModeContext);
