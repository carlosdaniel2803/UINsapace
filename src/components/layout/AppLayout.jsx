import React from "react";
import Header from "./Header";
import "./AppLayout.css";

// Envuelve cualquier página interna: encabezado arriba y contenido centrado
export default function AppLayout({ children, wide = false }) {
  return (
    <div className="app-layout">
      <Header />
      <main className={`app-layout__main${wide ? " app-layout__main--wide" : ""}`}>
        {children}
      </main>
    </div>
  );
}
