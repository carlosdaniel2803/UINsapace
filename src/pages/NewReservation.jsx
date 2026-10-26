import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useApi } from "../hooks/useApi";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Alert from "../components/ui/Alert";
import "./Pages.css";

const pad = (n) => String(n).padStart(2, "0");

export default function NewReservation() {
  const navigate = useNavigate();
  const rooms = useApi("/rooms");
  const d = new Date();
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const [form, setForm] = useState({
    room_id: "",
    date: today,
    start_time: "",
    end_time: "",
    purpose: "",
  });
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
      await api("/reservations", { method: "POST", body: form });
      setSuccess("Reservación creada");
      setTimeout(() => navigate("/reservas"), 900);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="page__form">
        <Card title="Nueva reserva">
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
              options={(rooms.data?.rooms ?? []).map((r) => ({
                value: r.id,
                label: `${r.name} (cap. ${r.capacity})`,
              }))}
            />
            <FormField label="Fecha" name="date" type="date" min={today} value={form.date} onChange={set} required />
            <FormField label="Hora de inicio" name="start_time" type="time" value={form.start_time} onChange={set} required />
            <FormField label="Hora de fin" name="end_time" type="time" value={form.end_time} onChange={set} required />
            <FormField
              label="Motivo (opcional)"
              name="purpose"
              maxLength={255}
              placeholder="Clase, examen, reunión…"
              value={form.purpose}
              onChange={set}
            />

            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Reservar"}
            </Button>
            <div className="page__back">
              <Button variant="outline" onClick={() => navigate("/reservas")}>
                Ver calendario
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
