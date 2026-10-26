import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useApi } from "../hooks/useApi";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Alert from "../components/ui/Alert";
import "./Pages.css";

const PRIORITY_OPTIONS = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export default function NewReport() {
  const navigate = useNavigate();
  const rooms = useApi("/rooms");

  const [form, setForm] = useState({ room_id: "", priority: "media", description: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api("/reports", { method: "POST", body: form });
      setSuccess("Reporte enviado");
      setForm({ room_id: "", priority: "media", description: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="page__form">
        <Card title="Nuevo reporte">
          <form onSubmit={handleSubmit}>
            <Alert>{error || rooms.error}</Alert>
            <Alert type="success">{success}</Alert>

            <FormField
              as="select"
              label="Salón"
              name="room_id"
              placeholder="Seleccionar salón"
              value={form.room_id}
              onChange={set}
              required
              options={(rooms.data?.rooms ?? []).map((r) => ({ value: r.id, label: r.name }))}
            />
            <FormField
              as="select"
              label="Urgencia"
              name="priority"
              value={form.priority}
              onChange={set}
              options={PRIORITY_OPTIONS}
            />
            <FormField
              as="textarea"
              label="Descripción de la anomalía"
              name="description"
              placeholder="Ej. El proyector no enciende"
              value={form.description}
              onChange={set}
              required
            />

            <Button type="submit" disabled={saving}>
              {saving ? "Enviando…" : "Enviar reporte"}
            </Button>
            <div className="page__back">
              <Button variant="outline" onClick={() => navigate("/inicio")}>
                Volver al inicio
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
