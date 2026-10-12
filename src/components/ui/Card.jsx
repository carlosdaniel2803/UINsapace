import React from "react";
import "./Card.css";

export default function Card({ title, children }) {
  return (
    <div className="ui-card">
      {title && <h2 className="ui-card__title">{title}</h2>}
      {children}
    </div>
  );
}
