import { useAuth } from "../context/AuthContext";
import { logout } from "../services/auth";
import { clearExportHistoryCache } from "../services/export";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import HeaderCustomerSearch from "./HeaderCustomerSearch";
import "../assets/css/header.css";

export default function Header() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  /* USER DROPDOWN STATE (SADECE BU) */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const firstLetter = user?.username?.[0]?.toUpperCase() || "?";

  /* ================= ACTIONS ================= */
  const goToProfile = () => {
    navigate("/profile");
    setUserMenuOpen(false);
  };

  const goToExportHistory = () => {
    navigate("/exports/history");
    setUserMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    clearExportHistoryCache();
    setUser(null);
    setUserMenuOpen(false);
    navigate("/login");
  };

  /* ================= CLICK OUTSIDE (SADECE USER MENU) ================= */
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= RENDER ================= */
  return (
    <header className="main-header">

      {/* 🔍 CUSTOMER SEARCH (KENDİ STATE'İNİ YÖNETİR) */}
      <HeaderCustomerSearch role={user?.role} />

      <div className="user-area">
        <div className="avatar">{firstLetter}</div>

        <div className="user-info">
          <span className="user-name">{user?.username}</span>
          <span className="user-role">{user?.role}</span>
        </div>

        {/* USER MENU */}
        <div className="dropdown" ref={userMenuRef}>
          <button
            className="dropdown-btn"
            onClick={() => setUserMenuOpen((prev) => !prev)}
          >
            ⋮
          </button>

          {userMenuOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={goToProfile}>
                Profile
              </button>
              {user?.is_staff && (
                <button className="dropdown-item" onClick={goToExportHistory}>
                  Export History
                </button>
              )}
              <button className="dropdown-item" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

    </header>
  );
}
