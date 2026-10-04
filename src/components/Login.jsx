import React, { useState } from "react";

export default function Login({ onSwitchToRegister }) {
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Iniciando sesión con:", credentials);
    // Aquí conectaras con tu backend (API)
  };

  return (
    <div className="auth-card">
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Correo Electrónico:</label>
          <input
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Contraseña:</label>
          <input
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className="btn-submit">
          Entrar
        </button>
      </form>
      <p className="toggle-text" onClick={onSwitchToRegister}>
        ¿No tienes cuenta? <span>Regístrate aquí</span>
      </p>
    </div>
  );
}
