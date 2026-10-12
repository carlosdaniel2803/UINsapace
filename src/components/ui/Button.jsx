import React from "react";
import "./Button.css";

export default function Button({ variant = "primary", type = "button", children, ...rest }) {
  return (
    <button type={type} className={`ui-button ui-button--${variant}`} {...rest}>
      {children}
    </button>
  );
}
