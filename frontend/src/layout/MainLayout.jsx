import Sidebar from "../layout/Sidebar";
import Header from "../layout/Header.jsx";
import { NotificationProvider } from "../context/NotificationContext";
import NotificationPanel from "../components/notifications/NotificationPanel";

export default function MainLayout({ children }) {
  return (
    <NotificationProvider>
      <div className="layout-wrapper">
        <Sidebar />

        <div className="content-wrapper">
          <Header />
          <div className="page-content">
            {children}
          </div>
        </div>

        <NotificationPanel />
      </div>
    </NotificationProvider>
  );
}
