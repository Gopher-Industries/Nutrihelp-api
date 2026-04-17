import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { UserContext } from '../../context/user.context';

const AuthenticateRoute = ({ children }) => {
  const { currentUser, setCurrentUser } = useContext(UserContext);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      const expirationTime = user.expirationTime;

      if (expirationTime && Date.now() > expirationTime) {
        localStorage.removeItem('user');
        setCurrentUser(null);
      }
    }
  }, [setCurrentUser]);

  return currentUser ? children : <Navigate to="/login" replace />;
};

export default AuthenticateRoute;
