import React from "react";
import "./SwitchLink.css";

export default function SwitchLink({ text, action, onClick }) {
  return (
    <button type="button" className="ui-switch-link" onClick={onClick}>
      {text} <span className="ui-switch-link__action">{action}</span>
    </button>
  );
}
