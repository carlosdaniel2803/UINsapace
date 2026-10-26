import { useState } from "react";
import { api } from "../api";
import Card from "./ui/Card";
import FormField from "./ui/FormField";
import Button from "./ui/Button";
import Alert from "./ui/Alert";
import SwitchLink from "./ui/SwitchLink";

export default function Register({ onSwitchToLogin, onRegistered }) {
  const [formData, setFormData] = useState({
    control_number: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/auth/register", { method: "POST", body: formData });
      onRegistered();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Registro UIN Space">
      <form onSubmit={handleSubmit}>
        <Alert>{error}</Alert>
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
        <Button type="submit" disabled={loading}>
          {loading ? "Registrando..." : "Registrarse"}
        </Button>
      </form>
      <SwitchLink
        text="¿Ya tienes cuenta?"
        action="Inicia sesión"
        onClick={onSwitchToLogin}
      />
    </Card>
  );
}
