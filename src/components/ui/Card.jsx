import "./Card.css";

// icon / subtitle son opcionales: con ellos el título queda alineado a la izquierda
export default function Card({ title, subtitle, icon, className = "", children }) {
  const classes = ["ui-card", className].filter(Boolean).join(" ");
  const richHeader = Boolean(icon || subtitle);

  return (
    <div className={classes}>
      {title && richHeader && (
        <div className="ui-card__head">
          <h2 className="ui-card__title ui-card__title--left">
            {title}
            {icon && <span className="ui-card__icon">{icon}</span>}
          </h2>
          {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
        </div>
      )}
      {title && !richHeader && <h2 className="ui-card__title">{title}</h2>}
      {children}
    </div>
  );
}
