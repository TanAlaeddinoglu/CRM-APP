import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { logout } from "../services/auth";
import { clearExportHistoryCache } from "../services/export";
import { useNavigate, useLocation, useNavigationType } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  PanelRightOpen,
  Trash2,
} from "lucide-react";
import HeaderCustomerSearch from "./HeaderCustomerSearch";
import NotificationTabbedList from "../components/notifications/NotificationTabbedList";
import ConfirmModal from "../components/common/ConfirmModal";
import { getNotificationUrl } from "../utils/notificationUrl";
import "../assets/css/header.css";

export default function Header() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();

  const MAX_STACK = 5;

  // Her entry: { pathname, browserIdx }
  // Dedup kriteri: pathname (search/hash görmezden gelinir)
  const dedupStack = useRef([{
    pathname: location.pathname,
    browserIdx: window.history.state?.idx ?? 0,
  }]);
  const dedupPos = useRef(0);
  const [navEnabled, setNavEnabled] = useState({ back: false, forward: false });

  const syncNav = () => {
    setNavEnabled({
      back: dedupPos.current > 0,
      forward: dedupPos.current < dedupStack.current.length - 1,
    });
  };

  useEffect(() => {
    const newPathname = location.pathname;
    const browserIdx = window.history.state?.idx ?? 0;

    if (navigationType === "POP") {
      // POP yönünü belirle: önceki entry'nin browserIdx'iyle karşılaştır
      const prevIdx = dedupStack.current[dedupPos.current]?.browserIdx ?? 0;
      const goingBack = browserIdx <= prevIdx;

      // Yönlü arama: duplicate pathname olsa da doğru entry'yi bul
      let found = -1;
      if (goingBack) {
        for (let i = dedupPos.current - 1; i >= 0; i--) {
          if (dedupStack.current[i].pathname === newPathname) { found = i; break; }
        }
      } else {
        for (let i = dedupPos.current + 1; i < dedupStack.current.length; i++) {
          if (dedupStack.current[i].pathname === newPathname) { found = i; break; }
        }
      }

      if (found >= 0) {
        dedupPos.current = found;
        // Gerçek browserIdx ile sync: stale değerleri düzelt
        dedupStack.current[found] = { pathname: newPathname, browserIdx };
      }
    } else {
      // PUSH / REPLACE
      const cur = dedupStack.current[dedupPos.current];

      if (cur?.pathname === newPathname) {
        // Aynı sayfa yeniden push edildi (setSearchParams vb.):
        // browserIdx güncelle + forward geçmişi temizle
        dedupStack.current = dedupStack.current.slice(0, dedupPos.current + 1);
        dedupStack.current[dedupPos.current] = { pathname: newPathname, browserIdx };
      } else {
        // Farklı sayfa: forward temizle, yeni entry ekle, max 5 tut
        let next = [
          ...dedupStack.current.slice(0, dedupPos.current + 1),
          { pathname: newPathname, browserIdx },
        ];
        if (next.length > MAX_STACK) next = next.slice(next.length - MAX_STACK);
        dedupStack.current = next;
        dedupPos.current = next.length - 1;
      }
    }

    syncNav();
  }, [location, navigationType]);

  const handleBack = () => {
    if (dedupPos.current <= 0) return;
    const target = dedupStack.current[dedupPos.current - 1];
    const delta = target.browserIdx - (window.history.state?.idx ?? 0);
    if (delta < 0) {
      navigate(delta);
    } else {
      // Entry bayatlamış: stack'ten temizle
      dedupStack.current = dedupStack.current.slice(0, dedupPos.current);
      dedupPos.current = Math.max(0, dedupPos.current - 1);
      syncNav();
    }
  };

  const handleForward = () => {
    if (dedupPos.current >= dedupStack.current.length - 1) return;
    const target = dedupStack.current[dedupPos.current + 1];
    const delta = target.browserIdx - (window.history.state?.idx ?? 0);
    if (delta > 0) {
      navigate(delta);
    } else {
      // Entry bayatlamış (loop kaynağı): forward stack'i temizle
      dedupStack.current = dedupStack.current.slice(0, dedupPos.current + 1);
      syncNav();
    }
  };

  const canGoBack = navEnabled.back;
  const canGoForward = navEnabled.forward;

  /* USER DROPDOWN STATE (SADECE BU) */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notificationMenuVisible, setNotificationMenuVisible] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);

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
    openPanel,
  } = useNotifications();

  const firstLetter = user?.username?.[0]?.toUpperCase() || "?";

  const openNotificationMenu = () => {
    setNotificationMenuVisible(true);
    requestAnimationFrame(() => {
      setNotificationMenuOpen(true);
    });
  };

  const closeNotificationMenu = () => {
    setNotificationMenuOpen(false);
  };

  const toggleNotificationMenu = () => {
    if (notificationMenuVisible) {
      closeNotificationMenu();
      return;
    }
    openNotificationMenu();
  };

  const handleExpandToPanel = () => {
    closeNotificationMenu();
    openPanel();
  };

  const handleNotificationActivate = (notification) => {
    markRead(notification);
    closeNotificationMenu();
    const url = getNotificationUrl(notification);
    if (url) navigate(url);
  };

  /* ================= ACTIONS ================= */
  const goToProfile = () => {
    navigate("/profile");
    setUserMenuOpen(false);
  };

  const goToExportHistory = () => {
    navigate("/exports/history");
    setUserMenuOpen(false);
  };

  const goToSettings = () => {
    navigate("/settings");
    setUserMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    clearExportHistoryCache();
    setUser(null);
    setUserMenuOpen(false);
    navigate("/login");
  };

  /* ================= CLICK OUTSIDE (SADECE USER MENU) ================= */
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(e.target)
      ) {
        closeNotificationMenu();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (notificationMenuOpen || !notificationMenuVisible) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setNotificationMenuVisible(false);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [notificationMenuOpen, notificationMenuVisible]);

  /* ================= RENDER ================= */
  return (
    <>
    <header className="main-header">

      {/* Sol grup: geri/ileri + search */}
      <div className="header-left">
        <div className="nav-history-group">
          <button
            className="nav-history-btn"
            onClick={handleBack}
            disabled={!canGoBack}
            aria-label="Geri"
            title="Geri"
            type="button"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <button
            className="nav-history-btn"
            onClick={handleForward}
            disabled={!canGoForward}
            aria-label="İleri"
            title="İleri"
            type="button"
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        </div>
        <HeaderCustomerSearch role={user?.role} />
      </div>

      <div className="user-area">
        <div className="notification-dropdown" ref={notificationMenuRef}>
          <button
            type="button"
            className="notification-btn"
            onClick={toggleNotificationMenu}
            aria-label="Bildirimler"
          >
            <Bell size={18} strokeWidth={2.2} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {notificationMenuVisible && (
            <div
              className={`notification-menu ${
                notificationMenuOpen ? "open" : "closing"
              }`}
            >
              <div className="notification-menu-header">
                <strong>Bildirimler</strong>
                <div className="notification-menu-header-actions">
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
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="notification-expand-btn"
                    onClick={handleExpandToPanel}
                    aria-label="Paneli genişlet"
                    title="Paneli genişlet"
                  >
                    <PanelRightOpen size={16} strokeWidth={2.2} />
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
            </div>
          )}
        </div>

        <div className="avatar">{firstLetter}</div>

        <div className="user-info">
          <span className="user-name">{user?.username}</span>
          <span className="user-role">{user?.role}</span>
        </div>

        {/* USER MENU */}
        <div className="dropdown" ref={userMenuRef}>
          <button
            className="dropdown-btn"
            onClick={() => setUserMenuOpen((prev) => !prev)}
          >
            ⋮
          </button>

          {userMenuOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={goToProfile}>
                Profil
              </button>
              <button className="dropdown-item" onClick={goToSettings}>
                Ayarlar
              </button>
              {user?.is_staff && (
                <button className="dropdown-item" onClick={goToExportHistory}>
                  Dışa Aktarma Geçmişi
                </button>
              )}
              <button className="dropdown-item" onClick={handleLogout}>
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>

    </header>

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
