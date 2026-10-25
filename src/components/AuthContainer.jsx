import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import logo from "../assets/uin-icon.png";
import "./AuthContainer.css";

export default function AuthContainer() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [notice, setNotice] = useState("");

  return (
    <div className="auth-page">
      <div className="auth-container">
        <img className="auth-container__logo" src={logo} alt="UIN Space" />
        {isLoginView ? (
          <Login
            notice={notice}
            onSwitchToRegister={() => {
              setNotice("");
              setIsLoginView(false);
            }}
          />
        ) : (
          <Register
            onRegistered={() => {
              setNotice("Cuenta creada. Ya puedes iniciar sesión.");
              setIsLoginView(true);
            }}
            onSwitchToLogin={() => setIsLoginView(true)}
          />
        )}
      </div>
    </div>
  );
}
