import React from "react";
import { Routes, Route } from "react-router-dom";
import AuthContainer from "./components/AuthContainer";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Reports from "./pages/Reports";
import NewReport from "./pages/NewReport";
import Reservations from "./pages/Reservations";
import NewReservation from "./pages/NewReservation";
import Roles from "./pages/admin/Roles";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthContainer />} />
      <Route
        path="/inicio"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute permission="reports.view_history">
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes/nuevo"
        element={
          <ProtectedRoute permission="reports.create">
            <NewReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservas"
        element={
          <ProtectedRoute permission="calendar.view">
            <Reservations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservas/nueva"
        element={
          <ProtectedRoute permission="reservations.create">
            <NewReservation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute permission="roles.manage">
            <Roles />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
