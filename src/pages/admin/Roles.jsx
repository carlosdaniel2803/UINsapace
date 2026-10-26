import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useApi } from "../../hooks/useApi";
import AppLayout from "../../components/layout/AppLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";
import Alert from "../../components/ui/Alert";
import "../Pages.css";

const GROUPS = {
  users: "Usuarios",
  roles: "Roles",
  rooms: "Salones",
  calendar: "Calendario",
  reservations: "Reservaciones",
  reports: "Reportes",
  data: "Información y estadísticas",
};

export default function Roles() {
  const navigate = useNavigate();
  const roles = useApi("/roles");
  const perms = useApi("/roles/permissions");

  const [form, setForm] = useState({ name: "", description: "" });
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Agrupa el catálogo por prefijo: "reports.create" -> grupo "reports"
  const grouped = {};
  (perms.data?.permissions ?? []).forEach((p) => {
    const g = p.code.split(".")[0];
    (grouped[g] ||= []).push(p);
  });

  const togglePerm = (code) =>
    setSelected((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api("/roles", { method: "POST", body: { ...form, permissions: selected } });
      setSuccess(`Rol "${form.name.trim()}" creado`);
      setForm({ name: "", description: "" });
      setSelected([]);
      roles.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    setError("");
    setSuccess("");
    try {
      await api(`/roles/${role.id}`, { method: "DELETE" });
      setSuccess(`Rol "${role.name}" eliminado`);
      roles.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const describe = (code) =>
    (perms.data?.permissions ?? []).find((p) => p.code === code)?.description || code;

  return (
    <AppLayout wide>
      <div className="page page__stack">
        <Card title="Roles">
          <div className="page__toolbar">
            <div className="page__spacer" />
            <Button size="small" variant="outline" onClick={() => navigate("/inicio")}>
              Inicio
            </Button>
          </div>

          <Alert>{error || roles.error}</Alert>
          <Alert type="success">{success}</Alert>

          <div className="list">
            {(roles.data?.roles ?? []).map((r) => {
              const blocked = r.is_system || r.user_count > 0;
              const why = r.is_system
                ? "Rol predeterminado: no se puede eliminar"
                : r.user_count > 0
                  ? "Tiene usuarios asignados"
                  : "Eliminar rol";
              return (
                <div key={r.id} className="list__item">
                  <div className="list__main">
                    <div className="list__title">
                      {r.name}
                      {r.is_system && <span className="badge">Predeterminado</span>}
                    </div>
                    <div className="list__meta">
                      {r.description || "Sin descripción"} · {r.user_count} usuario(s) ·{" "}
                      {r.permissions.length} permiso(s)
                    </div>
                    <details>
                      <summary>Ver permisos</summary>
                      <div className="chips">
                        {r.permissions.map((c) => (
                          <span key={c} className="chip" title={describe(c)}>
                            {c}
                          </span>
                        ))}
                        {r.permissions.length === 0 && <span className="chip">Ninguno</span>}
                      </div>
                    </details>
                  </div>
                  <button
                    type="button"
                    className="danger-btn"
                    disabled={blocked}
                    title={why}
                    onClick={() => handleDelete(r)}
                  >
                    Eliminar
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Crear rol">
          <form onSubmit={handleCreate}>
            <FormField
              label="Nombre del rol"
              name="name"
              maxLength={60}
              placeholder="Ej. Coordinación"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <FormField
              label="Descripción"
              name="description"
              maxLength={255}
              placeholder="¿Qué puede hacer este rol?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <p className="list__meta" style={{ margin: "18px 0 10px" }}>Permisos</p>
            {Object.entries(grouped).map(([g, items]) => (
              <div key={g} className="perm-group">
                <div className="perm-group__title">{GROUPS[g] || g}</div>
                {items.map((p) => (
                  <label key={p.code} className="perm">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.code)}
                      onChange={() => togglePerm(p.code)}
                    />
                    <span>
                      {p.description}
                      <small>{p.code}</small>
                    </span>
                  </label>
                ))}
              </div>
            ))}

            <Button type="submit" disabled={saving}>
              {saving ? "Creando…" : "Crear rol"}
            </Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
