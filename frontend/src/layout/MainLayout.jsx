// src/layout/MainLayout.jsx
import Sidebar from "./Sidebar";
import Header from "./Header";
import Breadcrumbs from "./Breadcrumbs";

export default function MainLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-main">
        <Header />
        <Breadcrumbs />

        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
