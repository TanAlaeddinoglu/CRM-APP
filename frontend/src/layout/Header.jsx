import { useAuth } from "../context/AuthContext";
import { logout } from "../services/auth";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import "../assets/css/header.css";

export default function Header() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const firstLetter = user?.username?.[0]?.toUpperCase() || "?";

  const goToProfile = () => {
    navigate("/profile");
    setOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate("/login");
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="main-header">

      <input className="search-input" placeholder="Search..." />

      <div className="user-area">

        <div className="avatar">{firstLetter}</div>

        <div className="user-info">
          <span className="user-name">{user?.username}</span>
          <span className="user-role">{user?.role}</span>
        </div>

        {/* CLICK DROPDOWN */}
        <div className="dropdown" ref={dropdownRef}>
          <button
            className="dropdown-btn"
            onClick={() => setOpen(!open)}
          >
            ⋮
          </button>

          {open && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={goToProfile}>Profile</button>
              <button className="dropdown-item" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>

      </div>

    </header>
  );
}
