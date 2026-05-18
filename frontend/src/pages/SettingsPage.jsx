import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import SecuritySettings from "../components/settings/SecuritySettings.jsx";
import NotificationSettings from "../components/settings/NotificationSettings.jsx";
import IntegrationSettings from "../components/settings/IntegrationSettings.jsx";
import { isAdmin } from "../utils/roles.js";
import "../assets/css/settings.css";

const SETTING_TABS = [
  { id: "security", label: "Güvenlik" },
  { id: "notifications", label: "Bildirim" },
  { id: "integrations", label: "Entegrasyon" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const canManageAdminSettings = isAdmin(user);
  const [activeTab, setActiveTab] = useState("security");

  const availableTabs = useMemo(() => {
    if (canManageAdminSettings) {
      return SETTING_TABS;
    }

    return SETTING_TABS.filter((tab) => tab.id === "security");
  }, [canManageAdminSettings]);

  const resolvedActiveTab = availableTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : availableTabs[0]?.id || "security";

  const activeContent = useMemo(() => {
    if (resolvedActiveTab === "notifications" && canManageAdminSettings) {
      return <NotificationSettings />;
    }

    if (resolvedActiveTab === "integrations" && canManageAdminSettings) {
      return <IntegrationSettings />;
    }

    return <SecuritySettings />;
  }, [canManageAdminSettings, resolvedActiveTab]);

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <h1 className="page-title">Ayarlar</h1>
      </div>

      <div className="settings-tabs">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`settings-tab ${resolvedActiveTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="settings-content-shell">
        <div key={resolvedActiveTab} className="settings-content">
          {activeContent}
        </div>
      </section>
    </div>
  );
}
