import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "./ui/Card";
import FormField from "./ui/FormField";
import Button from "./ui/Button";
import Alert from "./ui/Alert";
import SwitchLink from "./ui/SwitchLink";

export default function Login({ onSwitchToRegister, notice }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(credentials.email, credentials.password);
      navigate("/inicio");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Iniciar Sesión">
      <form onSubmit={handleSubmit}>
        <Alert type="success">{notice}</Alert>
        <Alert>{error}</Alert>
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
        <Button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <SwitchLink
        text="¿No tienes cuenta?"
        action="Regístrate aquí"
        onClick={onSwitchToRegister}
      />
    </Card>
  );
}
