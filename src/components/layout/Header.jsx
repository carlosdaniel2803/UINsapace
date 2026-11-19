import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import logo from "../../assets/uin-logo-dark.png";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="app-header">
      <Link to="/inicio" className="app-header__logo-link">
        <img className="app-header__logo" src={logo} alt="UIN Space" />
      </Link>

      <p className="app-header__by">
        Ingeniería y Desarrollo de Software • Carlos Daniel García Martínez
      </p>

      <div className="app-header__user">
        {user?.name && <span className="app-header__name">{user.name}</span>}
        <Button variant="outline" size="small" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
