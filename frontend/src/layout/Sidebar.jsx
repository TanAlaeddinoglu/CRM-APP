// src/layout/Sidebar.jsx
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">CRM</div>
      <nav className="sidebar-nav">
        <a href="/dashboard">Dashboard</a>
        <a href="/customers">Customers</a>
        <a href="/reports">Reports</a>
      </nav>
    </aside>
  );
}
