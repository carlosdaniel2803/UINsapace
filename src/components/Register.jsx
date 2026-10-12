import React, { useState } from "react";
import Card from "./ui/Card";
import FormField from "./ui/FormField";
import Button from "./ui/Button";
import SwitchLink from "./ui/SwitchLink";

const ROLES = [
  { value: "maestro", label: "Maestro" },
  { value: "administrador", label: "Administrador" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "directora", label: "Directora" },
];

export default function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    control_number: "",
    name: "",
    email: "",
    password: "",
    role: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Registrando usuario en la BD:", formData);
    // Aquí conectarás con tu backend (API)
  };

  return (
    <Card title="Registro UIN Space">
      <form onSubmit={handleSubmit}>
        <FormField
          label="Número de Control / ID:"
          name="control_number"
          value={formData.control_number}
          onChange={handleChange}
          required
        />
        <FormField
          label="Nombre Completo:"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <FormField
          as="select"
          label="Rol:"
          name="role"
          placeholder="Seleccionar Rol"
          options={ROLES}
          value={formData.role}
          onChange={handleChange}
          required
        />
        <FormField
          label="Correo Electrónico:"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <FormField
          label="Contraseña:"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          minLength={8}
          title="La contraseña debe tener al menos 8 caracteres"
          required
        />
        <Button type="submit">Registrarse</Button>
      </form>
      <SwitchLink
        text="¿Ya tienes cuenta?"
        action="Inicia sesión"
        onClick={onSwitchToLogin}
      />
    </Card>
  );
}
