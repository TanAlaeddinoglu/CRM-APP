import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, ChevronLeft, PanelRightClose, Trash2 } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import NotificationTabbedList from "./NotificationTabbedList";
import ConfirmModal from "../common/ConfirmModal";
import { getNotificationUrl } from "../../utils/notificationUrl";
import "../../assets/css/notification-panel.css";

export default function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    hasMore,
    isLoadingMore,
    loadOlderWeek,
    markRead,
    markAllRead,
    removeNotification,
    removeAll,
    panelOpen,
    openPanel,
    closePanel,
  } = useNotifications();

  const navigate = useNavigate();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const handleNotificationActivate = (notification) => {
    markRead(notification);
    const url = getNotificationUrl(notification);
    if (url) {
      closePanel();
      navigate(url);
    }
  };

  return (
    <>
      {/* Sağ kenardan çıkan, sola bakan ok şeklinde genişlet tutamağı */}
      {!panelOpen && (
        <button
          type="button"
          className="notification-edge-handle"
          onClick={openPanel}
          aria-label="Bildirim panelini aç"
          title="Bildirimler"
        >
          <ChevronLeft size={20} strokeWidth={2.4} />
          {unreadCount > 0 && (
            <span className="notification-edge-badge">{unreadCount}</span>
          )}
        </button>
      )}

      <div
        className={`notification-panel-overlay ${panelOpen ? "open" : ""}`}
        onClick={closePanel}
      />
      <aside
        className={`notification-panel ${panelOpen ? "open" : ""}`}
        role="dialog"
        aria-label="Bildirimler"
      >
            <div className="notification-panel-header">
              <strong>Bildirimler</strong>
              <div className="notification-panel-header-actions">
                <button
                  type="button"
                  className="notification-icon-action"
                  onClick={markAllRead}
                  aria-label="Tümünü oku"
                  title="Tümünü oku"
                >
                  <CheckCheck size={16} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="notification-icon-action danger"
                  onClick={() => setConfirmDeleteAll(true)}
                  aria-label="Tümünü sil"
                  title="Tümünü sil"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="notification-panel-close"
                  onClick={closePanel}
                  aria-label="Paneli küçült"
                  title="Küçült"
                >
                  <PanelRightClose size={18} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <NotificationTabbedList
              notifications={notifications}
              unreadCount={unreadCount}
              onNotificationClick={handleNotificationActivate}
              onDelete={removeNotification}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadOlderWeek}
            />
      </aside>

      <ConfirmModal
        open={confirmDeleteAll}
        title="Tüm Bildirimleri Sil"
        description="Tüm bildirimler kalıcı olarak silinecek. Onaylıyor musun?"
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={() => { setConfirmDeleteAll(false); removeAll(); }}
      />
    </>
  );
}
