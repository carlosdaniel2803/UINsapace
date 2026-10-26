import "./Alert.css";

export default function Alert({ type = "error", children }) {
  if (!children) return null;
  return (
    <div className={`ui-alert ui-alert--${type}`} role="alert">
      {children}
    </div>
  );
}
