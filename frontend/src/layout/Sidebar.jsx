import { useState } from "react";
import "../assets/css/sidebar.css";
import { Link, useLocation } from "react-router-dom";
import Logo from "../assets/melagrana-logo.png";
import { useAuth } from "../context/AuthContext";

import {
  Users,
  Calendar,
  CreditCard,
  Package,
  BarChart3,
  Activity,
  FileClock,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth() || {};
  const canSeeStaffItems = user?.is_staff ?? true;

  const menu = [
    { icon: <Users size={20} />, label: "Müşteriler", path: "/customers" },
    { icon: <Calendar size={20} />, label: "Randevular", path: "/events" },
    ...(!canSeeStaffItems
      ? [{ icon: <Activity size={20} />, label: "Performansım", path: "/performance" }]
      : []),
    ...(canSeeStaffItems
      ? [{ icon: <CreditCard size={20} />, label: "Ödemeler", path: "/payments" }]
      : []),
    { icon: <Package size={20} />, label: "Ürünler", path: "/products" },
    { icon: <Tag size={20} />, label: "Etiketler", path: "/tags" },
    ...(canSeeStaffItems
      ? [{ icon: <BarChart3 size={20} />, label: "Raporlar", path: "/reports" }]
      : []),
    ...(canSeeStaffItems
      ? [
          {
            icon: <FileClock size={20} />,
            label: "Dışa Aktarma Geçmişi",
            path: "/exports/history",
          },
        ]
      : []),
  ];

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* TOP */}
      <div className="sidebar-top">
        {!collapsed && (
          <Link to="/customers" className="sidebar-logo">
            <img src={Logo} alt="CRM Logo" className="sidebar-logo-img" />
          </Link>
        )}

        <button
          className="collapse-btn"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        {menu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={
              "nav-item " +
              (location.pathname.startsWith(item.path) ? "active" : "")
            }
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
