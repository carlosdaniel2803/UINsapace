import { createContext, useContext, useEffect, useState } from "react";
import { api, AUTH_UNAUTHORIZED_EVENT } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("token")),
  );

  // Al abrir la app, si hay token guardado, recupera al usuario
  useEffect(() => {
    if (!localStorage.getItem("token")) return;

    let cancelled = false;
    api("/auth/me")
      .then((data) => !cancelled && setUser(data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // El backend respondió 401: la sesión venció o el token fue revocado.
  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem("token");
      setUser(null);
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () =>
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = async (email, password) => {
    const { token } = await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    localStorage.setItem("token", token);
    const data = await api("/auth/me");
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // ¿El usuario tiene este permiso?  can("reports.create")
  const can = (permission) => !!user?.permissions.includes(permission);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
