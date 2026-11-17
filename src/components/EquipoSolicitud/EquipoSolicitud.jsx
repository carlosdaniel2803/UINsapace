import { useState } from "react";
import "./EquipoSolicitud.css";

const OPCIONES = [
  "Chromebook",
  "Cable HDMI",
  "Control de bocina",
  "Control de cañón",
  "Control del clima",
  "Manos libres",
  "Cable VGA",
  "Webcam",
  "Adaptador HDMI/VGA",
];

export default function EquipoSolicitud({ onChange }) {
  const [seleccion, setSeleccion] = useState([]);
  const [otroActivo, setOtroActivo] = useState(false);
  const [otroTexto, setOtroTexto] = useState("");

  const notificar = (sel, activo, texto) =>
    onChange?.({ equipo: sel, otro: activo ? texto.trim() : "" });

  const toggle = (item) => {
    const nueva = seleccion.includes(item)
      ? seleccion.filter((i) => i !== item)
      : [...seleccion, item];
    setSeleccion(nueva);
    notificar(nueva, otroActivo, otroTexto);
  };

  const toggleOtro = () => {
    const activo = !otroActivo;
    setOtroActivo(activo);
    notificar(seleccion, activo, otroTexto);
  };

  const cambiarTexto = (e) => {
    setOtroTexto(e.target.value);
    notificar(seleccion, otroActivo, e.target.value);
  };

  return (
    <fieldset className="equipo">
      <legend>Solicitar equipo</legend>

      <div className="equipo__lista">
        {OPCIONES.map((item) => (
          <label key={item} className="equipo__item">
            <input
              type="checkbox"
              checked={seleccion.includes(item)}
              onChange={() => toggle(item)}
            />
            {item}
          </label>
        ))}

        <label className="equipo__item">
          <input type="checkbox" checked={otroActivo} onChange={toggleOtro} />
          Otro
        </label>
      </div>

      {otroActivo && (
        <input
          type="text"
          className="equipo__otro"
          placeholder="Escribe qué equipo necesitas"
          value={otroTexto}
          onChange={cambiarTexto}
        />
      )}
    </fieldset>
  );
}
