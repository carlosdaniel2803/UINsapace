import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "./ui/Card";
import FormField from "./ui/FormField";
import Button from "./ui/Button";
import SwitchLink from "./ui/SwitchLink";

export default function Login({ onSwitchToRegister }) {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Iniciando sesión con:", credentials);
    // Aquí conectarás con tu backend (API)
    navigate("/inicio");
  };

  return (
    <Card title="Iniciar Sesión">
      <form onSubmit={handleSubmit}>
        <FormField
          label="Correo Electrónico:"
          type="email"
          name="email"
          value={credentials.email}
          onChange={handleChange}
          required
        />
        <FormField
          label="Contraseña:"
          type="password"
          name="password"
          value={credentials.password}
          onChange={handleChange}
          required
        />
        <Button type="submit">Entrar</Button>
      </form>
      <SwitchLink
        text="¿No tienes cuenta?"
        action="Regístrate aquí"
        onClick={onSwitchToRegister}
      />
    </Card>
  );
}
