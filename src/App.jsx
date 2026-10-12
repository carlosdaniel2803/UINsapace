import React from "react";
import { Routes, Route } from "react-router-dom";
import AuthContainer from "./components/AuthContainer";
import Home from "./pages/Home";
import PagePlaceholder from "./pages/PagePlaceholder";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthContainer />} />
      <Route path="/inicio" element={<Home />} />
      <Route path="/reportes" element={<PagePlaceholder title="Reportes" />} />
      <Route
        path="/reportes/nuevo"
        element={<PagePlaceholder title="Nuevo reporte" />}
      />
      <Route path="/reservas" element={<PagePlaceholder title="Reservas" />} />
      <Route
        path="/reservas/nueva"
        element={<PagePlaceholder title="Nueva reserva" />}
      />
    </Routes>
  );
}

export default App;
