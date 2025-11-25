// src/layout/Header.jsx
export default function Header() {
  return (
    <header className="header">

      {/* Sol boşluk (gerekli!) */}
      <div className="header-left"></div>

      {/* Ortadaki Search */}
      <div className="header-center">
        <input
          className="header-search"
          type="text"
          placeholder="Search..."
        />
      </div>

      {/* Sağdaki profil */}
      <div className="header-right">
        <span className="header-profile-name">User</span>
        <div className="header-avatar">U</div>
      </div>

    </header>
  );
}
