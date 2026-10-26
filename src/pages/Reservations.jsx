import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import Alert from "../components/ui/Alert";
import "./Pages.css";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function Reservations() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const now = new Date();
  const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate());

  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(todayStr);
  const [roomId, setRoomId] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const lastDay = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const from = ymd(cursor.y, cursor.m, 1);
  const to = ymd(cursor.y, cursor.m, lastDay);

  const rooms = useApi("/rooms");
  const { data, error, loading, reload } = useApi(
    `/reservations?from=${from}&to=${to}${roomId ? `&room_id=${roomId}` : ""}`,
  );

  const items = data?.reservations ?? [];
  const showDetails = can("reservations.view_all");
  const canCancelAny = can("reservations.cancel_any") || can("reservations.manage");

  // Cuántas reservas confirmadas hay por día
  const countByDay = {};
  items.forEach((r) => {
    if (r.status === "confirmada") countByDay[r.date] = (countByDay[r.date] || 0) + 1;
  });

  const offset = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7; // semana inicia en lunes
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];

  const shiftMonth = (delta) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const handleCancel = async (r) => {
    const reason = window.prompt("Motivo de la cancelación (opcional):", "");
    if (reason === null) return; // el usuario canceló el cuadro
    setBusyId(r.id);
    setActionError("");
    try {
      await api(`/reservations/${r.id}/cancel`, { method: "POST", body: { reason } });
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const dayItems = items.filter((r) => r.date === selected);
  const [sy, sm, sd] = selected.split("-").map(Number);

  return (
    <AppLayout wide>
      <div className="page page__stack">
        <Card title="Calendario de reservas">
          <div className="page__toolbar">
            <FormField
              as="select"
              label="Salón"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              options={[
                { value: "", label: "Todos los salones" },
                ...(rooms.data?.rooms ?? []).map((r) => ({ value: r.id, label: r.name })),
              ]}
            />
            <div className="page__spacer" />
            {can("reservations.create") && (
              <Button size="small" onClick={() => navigate("/reservas/nueva")}>
                Nueva reserva
              </Button>
            )}
            <Button size="small" variant="outline" onClick={() => navigate("/inicio")}>
              Inicio
            </Button>
          </div>

          <Alert>{error || actionError}</Alert>

          <div className="cal__head">
            <Button size="small" variant="outline" onClick={() => shiftMonth(-1)}>←</Button>
            <span className="cal__month">{MONTHS[cursor.m]} {cursor.y}</span>
            <Button size="small" variant="outline" onClick={() => shiftMonth(1)}>→</Button>
          </div>

          <div className="cal__grid">
            {DAYS.map((d) => (
              <div key={d} className="cal__dow">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={`b${i}`} className="cal__day cal__day--blank" />;
              const dateStr = ymd(cursor.y, cursor.m, day);
              const classes = ["cal__day"];
              if (dateStr === todayStr) classes.push("cal__day--today");
              if (dateStr === selected) classes.push("cal__day--selected");
              return (
                <button
                  key={dateStr}
                  type="button"
                  className={classes.join(" ")}
                  onClick={() => setSelected(dateStr)}
                >
                  <span>{day}</span>
                  {countByDay[dateStr] > 0 && (
                    <span className="cal__count">{countByDay[dateStr]} res.</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title={`${sd} de ${MONTHS[sm - 1]} de ${sy}`}>
          {loading && dayItems.length === 0 ? (
            <p className="page__empty">Cargando…</p>
          ) : dayItems.length === 0 ? (
            <p className="page__empty">No hay reservaciones este día</p>
          ) : (
            <div className="list">
              {dayItems.map((r, i) => {
                const cancelled = r.status === "cancelada";
                const canCancel =
                  !cancelled && r.id && (canCancelAny || r.mine);
                return (
                  <div
                    key={r.id ?? `${r.room_id}-${r.start_time}-${i}`}
                    className={`list__item${cancelled ? " list__item--muted" : ""}`}
                  >
                    <div className="list__main">
                      <div className="list__title">
                        {r.start_time} – {r.end_time} · {r.room_name}
                        {showDetails && (
                          <span className={`badge badge--${r.status}`}>{r.status}</span>
                        )}
                        {r.mine && <span className="badge badge--success">Mía</span>}
                      </div>
                      {r.user_name && (
                        <div className="list__meta">
                          Reservó: {r.user_name}
                          {r.purpose ? ` · ${r.purpose}` : ""}
                        </div>
                      )}
                      {cancelled && r.cancel_reason && (
                        <div className="list__meta">Motivo: {r.cancel_reason}</div>
                      )}
                    </div>
                    {canCancel && (
                      <button
                        type="button"
                        className="danger-btn"
                        disabled={busyId === r.id}
                        onClick={() => handleCancel(r)}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
