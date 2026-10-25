import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// <ProtectedRoute permission="reports.create"> ... </ProtectedRoute>
export default function ProtectedRoute({ permission, children }) {
  const { user, loading, can } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (permission && !can(permission)) return <Navigate to="/inicio" replace />;

  return children;
}
