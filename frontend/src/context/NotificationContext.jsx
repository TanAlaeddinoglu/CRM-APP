import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const olderWeeksRef = useRef(0);

  const loadNotifications = useCallback(() => {
    getNotifications({ offset_weeks: 0 })
      .then((res) => {
        const data = res.data;
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
        olderWeeksRef.current = 0;
        setHasMore(true);
      })
      .catch(() => {});
  }, []);

  const loadOlderWeek = useCallback(() => {
    const nextOffset = olderWeeksRef.current + 1;
    olderWeeksRef.current = nextOffset;
    setIsLoadingMore(true);
    getNotifications({ offset_weeks: nextOffset })
      .then((res) => {
        const older = res.data;
        setNotifications((prev) => [...prev, ...older]);
        if (older.length === 0) setHasMore(false);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMore(false));
  }, []);

  const markRead = useCallback((notification) => {
    if (notification.is_read) return;
    markNotificationRead(notification.id)
      .then(() => {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      })
      .catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    markAllNotificationsRead()
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      })
      .catch(() => {});
  }, []);

  const removeNotification = useCallback((notification) => {
    deleteNotification(notification.id)
      .then(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        if (!notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      })
      .catch(() => {});
  }, []);

  const removeAll = useCallback(() => {
    deleteAllNotifications()
      .then(() => {
        setNotifications([]);
        setUnreadCount(0);
      })
      .catch(() => {});
  }, []);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen((prev) => !prev), []);

  useEffect(() => {
    if (!user) return undefined;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30_000);
    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        hasMore,
        isLoadingMore,
        panelOpen,
        loadNotifications,
        loadOlderWeek,
        markRead,
        markAllRead,
        removeNotification,
        removeAll,
        openPanel,
        closePanel,
        togglePanel,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
