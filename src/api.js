// Cliente único para hablar con el backend
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Evento que avisa a toda la app que la sesión dejó de ser válida.
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  // El servidor rechazó el token (expiró o fue revocado): la sesión se cierra
  // en toda la app, no solo en la pantalla que hizo la petición.
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  }

  if (!res.ok) throw new Error(data.error || "Error en el servidor");
  return data;
}
