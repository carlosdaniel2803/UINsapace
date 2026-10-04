import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";

export default function AuthContainer() {
  const [isLoginView, setIsLoginView] = useState(true);

  return (
    <div className="auth-container">
      {isLoginView ? (
        <Login onSwitchToRegister={() => setIsLoginView(false)} />
      ) : (
        <Register onSwitchToLogin={() => setIsLoginView(true)} />
      )}
    </div>
  );
}
