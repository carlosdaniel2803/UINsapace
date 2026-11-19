import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { CalendarIcon, ReportIcon, GearIcon, LeafArt } from "../components/ui/Icons";
import "./Home.css";

// Cada acción solo se muestra si el usuario tiene el permiso.
// side: true -> la tarjeta va en la columna derecha (alta)
const SECTIONS = [
  {
    title: "Reserva",
    subtitle: "Gestiona tus citas y espacios",
    icon: <CalendarIcon />,
    actions: [
      {
        label: "Hacer reserva",
        to: "/reservas/nueva",
        permission: "reservations.create",
      },
      { label: "Ver calendario", to: "/reservas", permission: "calendar.view" },
    ],
  },

  {
    title: "Reporte",
    subtitle: "Creación y consulta de reportes",
    icon: <ReportIcon />,
    actions: [
      {
        label: "Crear reporte",
        to: "/reportes/nuevo",
        permission: "reports.create",
      },
      {
        label: "Ver reportes",
        to: "/reportes",
        permission: "reports.view_history",
      },
    ],
  },

  {
    title: "Administración",
    subtitle: "Configuración y gestión de accesos",
    icon: <GearIcon />,
    side: true,
    actions: [
      {
        label: "Gestionar roles",
        to: "/admin/roles",
        permission: "roles.manage",
      },
    ],
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  // Solo las secciones con al menos una acción permitida
  const visible = SECTIONS.map((section) => ({
    ...section,
    actions: section.actions.filter((a) => can(a.permission)),
  })).filter((section) => section.actions.length > 0);

  const main = visible.filter((s) => !s.side);
  const side = visible.filter((s) => s.side);

  const renderCard = (section) => (
    <Card
      key={section.title}
      className="home__card"
      title={section.title}
      subtitle={section.subtitle}
      icon={section.icon}
    >
      <div className="home__actions">
        {section.actions.map((action, i) => (
          <Button
            key={action.to}
            variant={i === 0 ? "primary" : "secondary"}
            onClick={() => navigate(action.to)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );

  return (
    <AppLayout>
      <div className="home">
        <div className="home__main">
          <section className="home__hero">
            <div className="home__hero-text">
              <h1 className="home__hero-title">
                ¡Bienvenido{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="home__hero-sub">Dashboard</p>
              <p className="home__hero-desc">
                Gestiona tus reservas y reportes.
              </p>
            </div>
            <LeafArt className="home__hero-art" />
          </section>

          {main.length > 0 && <div className="home__row">{main.map(renderCard)}</div>}
        </div>

        {side.length > 0 && <aside className="home__side">{side.map(renderCard)}</aside>}
      </div>
    </AppLayout>
  );
}
