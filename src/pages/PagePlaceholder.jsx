import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";

export default function PagePlaceholder({ title }) {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 20 }}>
      <h1>{title}</h1>
      <p>Me gusta la mama de michoacano</p>
      <Button onClick={() => navigate("/inicio")}>Volver al inicio</Button>
    </div>
  );
}
