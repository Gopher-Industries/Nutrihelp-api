// import React from 'react';
// import { createContext, useState } from 'react';

// //The function to set the context for the logged in user
// //This function will be called by the in-built react function, "userContext()"
// // in order to set the current user
// export const UserContext = createContext(
//     {
//         currentUser: null,
//         setCurrentUser: () => null
//     }
// )

// //Gives access to the values in the UserContext
// export const UserProvider = ({ children }) => {
//     //Set the current user
//     const [currentUser, setCurrentUser] = useState(null)

//     //Use destructuring to set the constant, "value"
//     //to take the function, setCurrentUser, and the variable, currentUser
//     const value = { currentUser, setCurrentUser }

//     return (
//         <UserContext.Provider value={value}>
//             {children}
//         </UserContext.Provider>
//     )
// }



// import React, { createContext, useState, useEffect } from 'react';

// // creating react context to configure logging in user
// export const UserContext = createContext({
//     currentUser: null,
//     setCurrentUser: () => null,
//     logOut: () => null,
// });

// export const UserProvider = ({ children }) => {
//     const [currentUser, setCurrentUser] = useState(() => {
//     //    get value of current user from localstorage
//         const userFromStorage = localStorage.getItem('user');
//         return userFromStorage ? JSON.parse(userFromStorage) : null;
//     });

//     // to add the user in local storage
//     const setUser = (user) => {
//         setCurrentUser(user);
//         if (user) {
//             localStorage.setItem('user', JSON.stringify(user)); 
//         } else {
//             localStorage.removeItem('user'); // remove storage data if there is no user
//         }
//     };

//     const logOut = () => {
//         localStorage.removeItem('user');
//         setCurrentUser(null);
//     };

//     const value = { currentUser, setCurrentUser: setUser, logOut };

//     return (
//         <UserContext.Provider value={value}>
//             {children}
//         </UserContext.Provider>
//     );
// };

// import React, { createContext, useState, useEffect } from 'react';

// export const UserContext = createContext({
//     currentUser: null,
//     setCurrentUser: () => null,
//     logOut: () => null,
// });

// export const UserProvider = ({ children }) => {
//     const [currentUser, setCurrentUser] = useState(() => {
//         // get value of current user from localstorage
//         const storedUser = localStorage.getItem('user');
//         const storedExpirationTime = localStorage.getItem('expirationTime');
        
//         if (storedUser && storedExpirationTime) {
//             // Check if the expiration time is still valid
//             const expirationTime = JSON.parse(storedExpirationTime);
//             if (Date.now() > expirationTime) {
//                 // If expired, clear the user data
//                 localStorage.removeItem('user');
//                 localStorage.removeItem('expirationTime');
//                 return null;
//             }
//             return JSON.parse(storedUser);
//         }
//         return null;
//     });

//     const setUser = (user, expirationTimeInMillis) => {
//         if (user) {
//             // Set expiration time if the user is logged in
//             setCurrentUser(user);
//             const expirationTime = Date.now() + expirationTimeInMillis;
//             localStorage.setItem('user', JSON.stringify(user));
//             localStorage.setItem('expirationTime', JSON.stringify(expirationTime));
//         } else {
//             // Clear user and expiration time if logged out
//             localStorage.removeItem('user');
//             localStorage.removeItem('expirationTime');
//         }
//     };

//     const logOut = () => {
//         localStorage.removeItem('user');
//         localStorage.removeItem('userExpireTime');
//         setCurrentUser(null);
//     };

//     const value = { currentUser, setCurrentUser: setUser, logOut };

//     return (
//         <UserContext.Provider value={value}>
//             {children}
//         </UserContext.Provider>
//     );
// };


import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const UserContext = createContext({
  currentUser: null,
  // same signature you call in Login.jsx: setCurrentUser(user, expirationTimeInMillis)
  setCurrentUser: (_user, _ttlMs = 0) => {},
  logOut: () => {},
});

const KEYS = {
  localUser: "user",                 // persistent (keep me logged in)
  localExpiry: "expirationTime",     // ms epoch
  sessionUser: "user_session",       // non-persistent (until tab/browser close)
};

// helpers
function readLocal() {
  try {
    const u = localStorage.getItem(KEYS.localUser);
    const exp = localStorage.getItem(KEYS.localExpiry);
    if (!u || !exp) return null;
    const expiresAt = JSON.parse(exp);
    if (typeof expiresAt === "number" && expiresAt > 0 && Date.now() > expiresAt) {
      // expired -> clear
      localStorage.removeItem(KEYS.localUser);
      localStorage.removeItem(KEYS.localExpiry);
      return null;
    }
    return JSON.parse(u);
  } catch {
    return null;
  }
}

function readSession() {
  try {
    const u = sessionStorage.getItem(KEYS.sessionUser);
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

function writeLocal(user, expiresAt) {
  localStorage.setItem(KEYS.localUser, JSON.stringify(user));
  localStorage.setItem(KEYS.localExpiry, JSON.stringify(expiresAt || 0));
  sessionStorage.removeItem(KEYS.sessionUser);
}

function writeSession(user) {
  sessionStorage.setItem(KEYS.sessionUser, JSON.stringify(user));
  localStorage.removeItem(KEYS.localUser);
  localStorage.removeItem(KEYS.localExpiry);
}

function clearAll() {
  localStorage.removeItem(KEYS.localUser);
  localStorage.removeItem(KEYS.localExpiry);
  sessionStorage.removeItem(KEYS.sessionUser);
}

export const UserProvider = ({ children }) => {
  // Rehydrate on first render: prefer persistent, else session
  const [currentUser, setCurrentUserState] = useState(() => {
    return readLocal() ?? readSession() ?? null;
  });

  const logoutTimerRef = useRef(null);
  const scheduleLogout = useCallback((expiresAt) => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (typeof expiresAt === "number" && expiresAt > 0) {
      const delay = Math.max(0, expiresAt - Date.now());
      logoutTimerRef.current = setTimeout(() => {
        clearAll();
        setCurrentUserState(null);
      }, delay);
    }
  }, []);

  // On mount, if local user exists with expiry, schedule auto-logout
  useEffect(() => {
    const exp = localStorage.getItem(KEYS.localExpiry);
    const expiresAt = exp ? JSON.parse(exp) : 0;
    scheduleLogout(expiresAt);

    // keep multiple tabs in sync
    const onStorage = (e) => {
      if (!e.key) return;

      // If persistent keys change
      if (e.key === KEYS.localUser || e.key === KEYS.localExpiry) {
        const u = readLocal();
        setCurrentUserState(u);
        const exp2 = localStorage.getItem(KEYS.localExpiry);
        scheduleLogout(exp2 ? JSON.parse(exp2) : 0);
      }

      // If session key changes
      if (e.key === KEYS.sessionUser) {
        const u = readSession();
        setCurrentUserState(u);
        scheduleLogout(0);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [scheduleLogout]);

  /**
   * setCurrentUser(user, ttlMs)
   * - ttlMs > 0  => persist in localStorage for ttlMs (keep me logged in)
   * - ttlMs === 0 => store in sessionStorage (dies on tab/browser close)
   */
  const setCurrentUser = useCallback((user, ttlMs = 0) => {
    if (user) {
      setCurrentUserState(user);
      if (ttlMs > 0) {
        const expiresAt = Date.now() + ttlMs;
        writeLocal(user, expiresAt);
        scheduleLogout(expiresAt);
      } else {
        writeSession(user);
        scheduleLogout(0);
      }
    } else {
      // explicit clear
      clearAll();
      setCurrentUserState(null);
      scheduleLogout(0);
    }
  }, [scheduleLogout]);

  const logOut = useCallback(() => {
    clearAll();
    setCurrentUserState(null);
    scheduleLogout(0);
  }, [scheduleLogout]);

  const value = useMemo(
    () => ({ currentUser, setCurrentUser, logOut }),
    [currentUser, setCurrentUser, logOut]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
