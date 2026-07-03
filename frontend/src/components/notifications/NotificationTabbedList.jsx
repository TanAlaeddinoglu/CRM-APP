import { useState } from "react";
import { Trash2 } from "lucide-react";
import { groupNotifications } from "../../utils/notificationGroups";

function formatRelativeTime(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return "Az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

// Okunmamış / Geçmiş sekmeleri + kategoriye göre gruplanmış liste.
// Hem header dropdown'ında hem yandan panelde ortak kullanılır.
export default function NotificationTabbedList({
  notifications,
  unreadCount,
  onNotificationClick,
  onDelete,
  hasMore,
  isLoadingMore,
  onLoadMore,
}) {
  const [activeTab, setActiveTab] = useState("unread");
  const isUnread = activeTab === "unread";
  const groups = groupNotifications(notifications, { read: !isUnread });

  return (
    <>
      <div className="notification-tabs">
        <button
          type="button"
          className={`notification-tab ${isUnread ? "active" : ""}`}
          onClick={() => setActiveTab("unread")}
        >
          Okunmamış
          {unreadCount > 0 && (
            <span className="notification-tab-count">{unreadCount}</span>
          )}
        </button>
        <button
          type="button"
          className={`notification-tab ${!isUnread ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Geçmiş
        </button>
      </div>

      <div className="notification-list">
        {groups.length === 0 ? (
          <div className="notification-empty">
            <span>
              {isUnread ? "Okunmamış bildirim yok." : "Geçmiş bildirim yok."}
            </span>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.category} className="notification-group">
              <div className="notification-group-header">{group.category}</div>
              {group.items.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    notification.is_read ? "read" : "unread"
                  }`}
                >
                  <button
                    type="button"
                    className="notification-item-body"
                    onClick={() => onNotificationClick(notification)}
                  >
                    <div className="notification-item-main">
                      <div className="notification-item-title-row">
                        <span className="notification-item-title">
                          {notification.title}
                        </span>
                        {!notification.is_read && (
                          <span className="notification-unread-dot" />
                        )}
                      </div>
                      <p className="notification-item-message">
                        {notification.body}
                      </p>
                    </div>
                    <span className="notification-item-time">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="notification-item-delete"
                    onClick={() => onDelete(notification)}
                    aria-label="Bildirimi sil"
                    title="Sil"
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="notification-menu-footer">
        {hasMore ? (
          <button
            type="button"
            className="notification-footer-link"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Yükleniyor…" : "Daha fazla yükle"}
          </button>
        ) : (
          <span className="notification-footer-end">
            Tüm bildirimler yüklendi.
          </span>
        )}
      </div>
    </>
  );
}
