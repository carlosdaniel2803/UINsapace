import React from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function PagePlaceholder({ title }) {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Card title={title}>
          <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
            Página en construcción
          </p>
          <Button onClick={() => navigate("/inicio")}>Volver al inicio</Button>
        </Card>
      </div>
    </AppLayout>
  );
}
