import { useState } from "react";
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

// El rol con acceso total: ni se renombra ni se cambian sus permisos.
const ADMIN_CODE = "administrador";

const EMPTY_FORM = { name: "", description: "" };

export default function Roles() {
  const navigate = useNavigate();
  const roles = useApi("/roles");
  const perms = useApi("/roles/permissions");

  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [newPerm, setNewPerm] = useState(EMPTY_FORM);
  const [permEdit, setPermEdit] = useState(null);
  const [permForm, setPermForm] = useState(EMPTY_FORM);
  const [permError, setPermError] = useState("");
  const [permSuccess, setPermSuccess] = useState("");

  // Groups the catalog by prefix: "reports.create" -> "reports" group
  const grouped = {};
  (perms.data?.permissions ?? []).forEach((p) => {
    const g = p.code.split(".")[0];
    (grouped[g] ||= []).push(p);
  });

  const togglePerm = (code) =>
    setSelected((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelected([]);
    setEditing(null);
  };

  const startEdit = (role) => {
    setEditing(role);
    setForm({ name: role.name, description: role.description || "" });
    setSelected(role.permissions ?? []);
    setError("");
    setSuccess("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      if (editing) {
        // System roles keep their name and description; only their permissions change.
        if (!editing.is_system) {
          await api(`/roles/${editing.id}`, {
            method: "PUT",
            body: { name: form.name, description: form.description },
          });
        }
        await api(`/roles/${editing.id}/permissions`, {
          method: "PUT",
          body: { permissions: selected },
        });
        setSuccess(`Rol "${editing.name}" actualizado`);
        resetForm();
      } else {
        await api("/roles", { method: "POST", body: { ...form, permissions: selected } });
        setSuccess(`Rol "${form.name.trim()}" creado`);
        resetForm();
      }
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
      if (editing?.id === role.id) resetForm();
      roles.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreatePerm = async (e) => {
    e.preventDefault();
    setPermError("");
    setPermSuccess("");
    try {
      await api("/roles/permissions", { method: "POST", body: newPerm });
      setPermSuccess(`Permiso "${newPerm.code.trim()}" creado`);
      setNewPerm(EMPTY_FORM);
      perms.reload();
    } catch (err) {
      setPermError(err.message);
    }
  };

  const startPermEdit = (permission) => {
    setPermEdit(permission);
    setPermForm({ code: permission.code, description: permission.description || "" });
    setPermError("");
    setPermSuccess("");
  };

  const savePerm = async (e) => {
    e.preventDefault();
    setPermError("");
    setPermSuccess("");
    try {
      await api(`/roles/permissions/${permEdit.id}`, { method: "PATCH", body: permForm });
      setPermSuccess(`Permiso "${permEdit.code}" actualizado`);
      setPermEdit(null);
      setPermForm(EMPTY_FORM);
      perms.reload();
    } catch (err) {
      setPermError(err.message);
    }
  };

  const deletePerm = async (permission) => {
    if (!window.confirm(`¿Eliminar el permiso "${permission.code}"?`)) return;
    setPermError("");
    setPermSuccess("");
    try {
      await api(`/roles/permissions/${permission.id}`, { method: "DELETE" });
      setPermSuccess(`Permiso "${permission.code}" eliminado`);
      perms.reload();
    } catch (err) {
      setPermError(err.message);
    }
  };

  const describe = (code) =>
    (perms.data?.permissions ?? []).find((p) => p.code === code)?.description || code;

  const locked = editing?.is_system;

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
                ? "Rol del sistema: no se puede eliminar"
                : r.user_count > 0
                  ? "Tiene usuarios asignados"
                  : "Eliminar rol";
              const isAdmin = r.code === ADMIN_CODE;
              return (
                <div key={r.id} className="list__item">
                  <div className="list__main">
                    <div className="list__title">
                      {r.name}
                      {r.is_system && <span className="badge">Del sistema</span>}
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
                  <div className="list__actions">
                    <Button
                      size="small"
                      variant="outline"
                      disabled={isAdmin}
                      title={
                        isAdmin
                          ? "El rol Administrador no se puede modificar"
                          : r.is_system
                            ? "Solo se pueden editar sus permisos"
                            : "Editar rol"
                      }
                      onClick={() => startEdit(r)}
                    >
                      Editar
                    </Button>
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
                </div>
              );
            })}
          </div>
        </Card>

        <Card title={editing ? `Editar rol: ${editing.name}` : "Crear rol"}>
          <form onSubmit={handleCreate}>
            {locked && (
              <Alert>
                Este rol es del sistema: su nombre y descripción no se pueden cambiar, solo sus
                permisos.
              </Alert>
            )}
            <FormField
              label="Nombre del rol"
              name="name"
              maxLength={60}
              placeholder="Ej. Coordinación"
              value={form.name}
              disabled={locked}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <FormField
              label="Descripción"
              name="description"
              maxLength={255}
              placeholder="¿Qué puede hacer este rol?"
              value={form.description}
              disabled={locked}
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

            <div className="list__actions">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear rol"}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card title="Catálogo de permisos">
          <Alert>{permError}</Alert>
          <Alert type="success">{permSuccess}</Alert>

          <div className="list">
            {(perms.data?.permissions ?? []).map((p) => (
              <div key={p.id} className="list__item">
                <div className="list__main">
                  <div className="list__title">
                    {p.code}
                    {p.is_system && <span className="badge">Base</span>}
                  </div>
                  <div className="list__meta">{p.description || "Sin descripción"}</div>
                </div>
                <div className="list__actions">
                  <Button size="small" variant="outline" onClick={() => startPermEdit(p)}>
                    Editar
                  </Button>
                  <button
                    type="button"
                    className="danger-btn"
                    disabled={p.is_system}
                    title={
                      p.is_system
                        ? "Los permisos base no se pueden eliminar"
                        : "Eliminar permiso"
                    }
                    onClick={() => deletePerm(p)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {permEdit && (
            <form onSubmit={savePerm} style={{ marginTop: "18px" }}>
              <p className="list__meta" style={{ margin: "0 0 10px" }}>
                Editando permiso: {permEdit.code}
              </p>
              <FormField
                label="Clave"
                name="perm_code"
                maxLength={50}
                placeholder="recurso.accion"
                value={permForm.code}
                disabled={permEdit.is_system}
                onChange={(e) => setPermForm({ ...permForm, code: e.target.value })}
                required
              />
              <FormField
                label="Descripción"
                name="perm_description"
                maxLength={255}
                value={permForm.description}
                onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
              />
              <div className="list__actions">
                <Button type="submit">Guardar permiso</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPermEdit(null);
                    setPermForm(EMPTY_FORM);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          <form onSubmit={handleCreatePerm} style={{ marginTop: "18px" }}>
            <p className="list__meta" style={{ margin: "0 0 10px" }}>Nuevo permiso</p>
            <FormField
              label="Clave"
              name="new_perm_code"
              maxLength={50}
              placeholder="recurso.accion"
              value={newPerm.code}
              onChange={(e) => setNewPerm({ ...newPerm, code: e.target.value })}
              required
            />
            <FormField
              label="Descripción"
              name="new_perm_description"
              maxLength={255}
              placeholder="¿Qué permite este permiso?"
              value={newPerm.description}
              onChange={(e) => setNewPerm({ ...newPerm, description: e.target.value })}
            />
            <Button type="submit">Crear permiso</Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}