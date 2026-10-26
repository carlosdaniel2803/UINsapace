import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import logo from "../../assets/uin-logo-white.png";
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

      <div className="app-header__user">
        <span className="app-header__name">{user?.name}</span>
        <Button variant="outline" size="small" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
