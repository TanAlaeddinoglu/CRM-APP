import {useState} from "react";
import "../assets/css/sidebar.css";
import {Link, useLocation} from "react-router-dom";
import Logo from "../assets/logo.png";


import {
    Users,
    Calendar,
    CreditCard,
    Package,
    BarChart3,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    const menu = [
        {icon: <Users size={20}/>, label: "Customers", path: "/customers"},
        {icon: <Calendar size={20}/>, label: "Events", path: "/events"},
        {icon: <CreditCard size={20}/>, label: "Payments", path: "/payments"},
        {icon: <Package size={20}/>, label: "Products", path: "/products"},
        {icon: <BarChart3 size={20}/>, label: "Reports", path: "/reports"},
    ];

    return (
        <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            {/* TOP */}
            <div className="sidebar-top">
                {!collapsed && (
                    <Link to="/" className="sidebar-logo">
                        <img src={Logo} alt="CRM Logo" className="sidebar-logo-img"/>
                    </Link>
                )}


                <button
                    className="collapse-btn"
                    onClick={() => setCollapsed((prev) => !prev)}
                >
                    {collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
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
