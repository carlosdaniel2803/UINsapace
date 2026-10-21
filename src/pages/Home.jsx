import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import "./Home.css";

const SECTIONS = [
  {
    title: "Reporte",
    actions: [
      { label: "Crear reporte", to: "/reportes/nuevo" },
      { label: "Ver reportes", to: "/reportes" },
    ],
  },
  {
    title: "Reserva",
    actions: [
      { label: "Hacer reserva", to: "/reservas/nueva" },
      { label: "Ver reservas", to: "/reservas" },
    ],
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      {SECTIONS.map((section) => (
        <div className="home__section" key={section.title}>
          <Card title={section.title}>
            {section.actions.map((action) => (
              <Button key={action.to} onClick={() => navigate(action.to)}>
                {action.label}
              </Button>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
