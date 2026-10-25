import React from "react";
import "./Button.css";

// variant: "primary" | "outline"     size: "default" | "small"
export default function Button({
  variant = "primary",
  size = "default",
  type = "button",
  children,
  ...rest
}) {
  const classes = ["ui-button", `ui-button--${variant}`];
  if (size === "small") classes.push("ui-button--small");

  return (
    <button type={type} className={classes.join(" ")} {...rest}>
      {children}
    </button>
  );
}
