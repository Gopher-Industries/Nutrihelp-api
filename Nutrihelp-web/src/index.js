// import React from 'react';
// import ReactDOM from 'react-dom';
// import App from './App'; // Create this component later

// ReactDOM.render(
//     <React.StrictMode>
//         <App />
//     </React.StrictMode>,
//     document.getElementById('root')
// );

import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { UserProvider } from "./context/user.context";
import { DarkModeProvider } from "./routes/DarkModeToggle/DarkModeContext";
import SupabaseUserSync from "./auth/SupabaseUserSync";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <UserProvider>
    <DarkModeProvider>
      <SupabaseUserSync />
      <App />
    </DarkModeProvider>
  </UserProvider>
);
