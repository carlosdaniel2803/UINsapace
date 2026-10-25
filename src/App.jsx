import React from "react";
import { Routes, Route } from "react-router-dom";
import AuthContainer from "./components/AuthContainer";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import PagePlaceholder from "./pages/PagePlaceholder";

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
            <PagePlaceholder title="Reportes" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes/nuevo"
        element={
          <ProtectedRoute permission="reports.create">
            <PagePlaceholder title="Nuevo reporte" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservas"
        element={
          <ProtectedRoute permission="calendar.view">
            <PagePlaceholder title="Calendario de reservas" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservas/nueva"
        element={
          <ProtectedRoute permission="reservations.create">
            <PagePlaceholder title="Nueva reserva" />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
