import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute — wraps any page that requires:
 *   1. Authentication (token + valid user)
 *   2. Specific roles (optional)
 *   3. Approved account_status (optional)
 *
 * Usage:
 *   <ProtectedRoute roles={['citizen']}> <Dashboard /> </ProtectedRoute>
 *   <ProtectedRoute roles={['admin']}>   <AdminPanel /> </ProtectedRoute>
 */
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Authenticating…</p>
      </div>
    );
  }

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Account status checks
  if (user.account_status === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }
  if (user.account_status === 'rejected') {
    return <Navigate to="/login" state={{ rejected: true }} replace />;
  }
  if (user.account_status === 'suspended') {
    return <Navigate to="/login" state={{ suspended: true }} replace />;
  }

  // Role check (if roles array is non-empty)
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
