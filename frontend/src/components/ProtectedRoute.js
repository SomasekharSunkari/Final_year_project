import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await Auth.currentAuthenticatedUser();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;