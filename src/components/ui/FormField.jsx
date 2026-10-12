import React, { useId } from "react";
import "./FormField.css";

/**
 * Campo reutilizable.
 * - Input:  <FormField label="Correo" name="email" type="email" value onChange />
 * - Select: <FormField as="select" label="Rol" name="role" options={[{value,label}]}
 *            placeholder="Seleccionar Rol" value onChange />
 */
export default function FormField({
  label,
  name,
  as = "input",
  type = "text",
  options = [],
  placeholder,
  ...rest
}) {
  const id = useId();

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>

      {as === "select" ? (
        <select
          id={id}
          name={name}
          className="ui-field__control ui-field__control--select"
          {...rest}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="ui-field__option">
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          className="ui-field__control"
          {...rest}
        />
      )}
    </div>
  );
}
