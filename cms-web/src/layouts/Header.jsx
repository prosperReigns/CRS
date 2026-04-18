import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";

const POLL_INTERVAL_MS = 15000;
const NOTIFICATION_BUTTON_ID = "header-notification-menu-button";

function Header({ isSidebarOpen, onSidebarToggle }) {
  const { user, logout } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const notificationMenuRef = useRef(null);
  const notificationButtonRef = useRef(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotifications();
      setNotifications(data);
      setNotificationError("");
    } catch (error) {
      setNotificationError(error.message || "Failed to load notifications.");
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications, user]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event) => {
      const clickedOutsideMenu =
        notificationMenuRef.current && !notificationMenuRef.current.contains(event.target);
      const clickedOutsideButton =
        notificationButtonRef.current && !notificationButtonRef.current.contains(event.target);
      if (clickedOutsideMenu && clickedOutsideButton) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const handleMarkRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
    } catch (error) {
      setNotificationError(error.message || "Failed to mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
    } catch (error) {
      setNotificationError(error.message || "Failed to mark all notifications as read.");
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSidebarToggle}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={isSidebarOpen}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          {isSidebarOpen ? "Hide Menu" : "Show Menu"}
        </button>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {user?.username} ({user?.role})
        </span>
        {user?.is_frozen && (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-700">
            Your account is temporarily restricted. Please submit your pending report.
          </span>
        )}

        <div ref={notificationMenuRef} className="relative ml-auto">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            ref={notificationButtonRef}
            id={NOTIFICATION_BUTTON_ID}
            aria-label="Notifications menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`relative rounded-lg border px-3 py-2 text-sm font-medium transition ${
              unreadCount > 0
                ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-red-600">
                {unreadCount}
              </span>
            )}
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-labelledby={NOTIFICATION_BUTTON_ID}
              className="absolute right-0 mt-2 max-h-96 w-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Recent notifications</p>
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-brand-600 transition hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </button>
              </div>
              {notificationError && <p className="text-xs text-rose-600">{notificationError}</p>}
              {notifications.length === 0 && <p className="text-sm text-slate-500">No notifications yet.</p>}
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !notification.is_read) {
                      event.preventDefault();
                      handleMarkRead(notification.id);
                    }
                  }}
                  className={`rounded-md border p-2 text-sm ${
                    notification.is_read
                      ? "border-slate-200 bg-slate-50 text-slate-600"
                      : "border-brand-200 bg-brand-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{notification.title}</p>
                    {!notification.is_read && (
                      <button
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p>{notification.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
