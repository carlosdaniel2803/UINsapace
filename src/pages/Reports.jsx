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

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En proceso" },
  { value: "resuelto", label: "Resuelto" },
];

const fmt = (iso) =>
  new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

export default function Reports() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [status, setStatus] = useState("");
  const [actionError, setActionError] = useState("");

  const { data, error, loading, reload } = useApi(
    `/reports${status ? `?status=${status}` : ""}`,
  );
  const reports = data?.reports ?? [];
  const canChangeStatus = can("reports.update_status") || can("reports.manage");

  const run = async (fn) => {
    setActionError("");
    try {
      await fn();
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const changeStatus = (id, next) =>
    run(() => api(`/reports/${id}/status`, { method: "PATCH", body: { status: next } }));

  const remove = (id) => {
    if (!window.confirm("¿Eliminar este reporte? No se puede deshacer.")) return;
    run(() => api(`/reports/${id}`, { method: "DELETE" }));
  };

  return (
    <AppLayout wide>
      <div className="page">
        <Card title="Reportes">
          <div className="page__toolbar">
            <FormField
              as="select"
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[{ value: "", label: "Todos" }, ...STATUS_OPTIONS]}
            />
            <div className="page__spacer" />
            {can("reports.create") && (
              <Button size="small" onClick={() => navigate("/reportes/nuevo")}>
                Nuevo reporte
              </Button>
            )}
            <Button size="small" variant="outline" onClick={() => navigate("/inicio")}>
              Inicio
            </Button>
          </div>

          <Alert>{error || actionError}</Alert>

          {loading && reports.length === 0 ? (
            <p className="page__empty">Cargando…</p>
          ) : reports.length === 0 ? (
            <p className="page__empty">No hay reportes</p>
          ) : (
            <div className="list">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className={`list__item${r.status === "resuelto" ? " list__item--muted" : ""}`}
                >
                  <div className="list__main">
                    <div className="list__title">
                      {r.room_name}
                      <span className={`badge badge--${r.priority}`}>{r.priority}</span>
                      <span className={`badge badge--${r.status}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="list__meta">
                      {r.user_name} · {fmt(r.created_at)}
                    </div>
                    <div className="list__text">{r.description}</div>
                    {r.resolution_notes && (
                      <div className="list__meta">Resolución: {r.resolution_notes}</div>
                    )}
                  </div>

                  <div className="list__actions">
                    {canChangeStatus && (
                      <FormField
                        as="select"
                        label=""
                        value={r.status}
                        onChange={(e) => changeStatus(r.id, e.target.value)}
                        options={STATUS_OPTIONS}
                        aria-label="Cambiar estado"
                      />
                    )}
                    {can("reports.manage") && (
                      <button type="button" className="danger-btn" onClick={() => remove(r.id)}>
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
