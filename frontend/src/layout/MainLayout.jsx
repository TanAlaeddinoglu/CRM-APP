import Sidebar from "../layout/Sidebar";
import Header from "../layout/Header.jsx";

export default function MainLayout({ children }) {
  return (
    <div className="layout-wrapper">
      <Sidebar />

      <div className="content-wrapper">
        <Header />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
