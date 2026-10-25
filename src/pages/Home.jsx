import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import "./Home.css";

// Cada acción solo se muestra si el usuario tiene el permiso
const SECTIONS = [
  {
    title: "Reporte",
    actions: [
      { label: "Crear reporte", to: "/reportes/nuevo", permission: "reports.create" },
      { label: "Ver reportes", to: "/reportes", permission: "reports.view_history" },
    ],
  },
  {
    title: "Reserva",
    actions: [
      { label: "Hacer reserva", to: "/reservas/nueva", permission: "reservations.create" },
      { label: "Ver calendario", to: "/reservas", permission: "calendar.view" },
    ],
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user, can, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="home">
      {SECTIONS.map((section) => {
        const actions = section.actions.filter((a) => can(a.permission));
        if (actions.length === 0) return null;

        return (
          <div className="home__section" key={section.title}>
            <Card title={section.title}>
              {actions.map((action) => (
                <Button key={action.to} onClick={() => navigate(action.to)}>
                  {action.label}
                </Button>
              ))}
            </Card>
          </div>
        );
      })}

      <div className="home__session">
        <span>{user?.name}</span>
        <Button onClick={handleLogout}>Cerrar sesión</Button>
      </div>
    </div>
  );
}
