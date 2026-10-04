import React, { useState } from "react";

export default function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    control_number: "",
    name: "",
    email: "",
    password: "",
    role: "maestro",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Registrando usuario en la BD:", formData);
    // Aquí conectaras con tu backend (API)
  };

  return (
    <div className="auth-card">
      <h2>Registro UIN Space</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Número de Control / ID:</label>
          <input
            type="text"
            name="control_number"
            value={formData.control_number}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Nombre Completo:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Rol:</label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="maestro">Maestro</option>
            <option value="estudiante">Estudiante</option>
            <option value="administrador">Administrador</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="directora">Directora</option>
          </select>
        </div>
        <div className="form-group">
          <label>Correo Electrónico:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Contraseña:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength={8}
            title="La contraseña debe tener al menos 8 caracteres"
            required
          />
        </div>
        <button type="submit" className="btn-submit">
          Registrarse
        </button>
      </form>
      <p className="toggle-text" onClick={onSwitchToLogin}>
        ¿Ya tienes cuenta? <span>Inicia sesión</span>
      </p>
    </div>
  );
}
