import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/layout/AppLayout";
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
  const { can } = useAuth();

  return (
    <AppLayout>
      <div className="home">
        {SECTIONS.map((section) => {
          const actions = section.actions.filter((a) => can(a.permission));
          if (actions.length === 0) return null;

          return (
            <div className="home__section" key={section.title}>
              <Card title={section.title}>
                <div className="home__actions">
                  {actions.map((action) => (
                    <Button key={action.to} onClick={() => navigate(action.to)}>
                      {action.label}
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
