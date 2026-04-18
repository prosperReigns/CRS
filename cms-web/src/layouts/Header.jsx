import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";

const POLL_INTERVAL_MS = 15000;
const NOTIFICATION_BUTTON_ID = "header-notification-menu-button";

function Header({ isSidebarOpen, onSidebarToggle }) {
  const { user, logout } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationError, setNotificationError] = useState("");
  const notificationMenuRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const notificationDialogRef = useRef(null);

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
        if (selectedNotification) {
          setSelectedNotification(null);
          return;
        }
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen, selectedNotification]);

  useEffect(() => {
    if (!selectedNotification || !notificationDialogRef.current) return;
    const firstFocusable = notificationDialogRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [selectedNotification]);

  const handleMarkRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
      return true;
    } catch (error) {
      setNotificationError(error.message || "Failed to mark notification as read.");
      return false;
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

  const handleOpenNotification = async (notification) => {
    if (!notification.is_read) {
      const markedRead = await handleMarkRead(notification.id);
      setSelectedNotification(markedRead ? { ...notification, is_read: true } : notification);
      return;
    }
    setSelectedNotification(notification);
  };

  const handleDialogKeyDown = (event) => {
    if (event.key !== "Tab" || !notificationDialogRef.current) return;
    const focusableElements = notificationDialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
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
                  onClick={() => handleOpenNotification(notification)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenNotification(notification);
                    }
                  }}
                  className={`cursor-pointer rounded-md border p-2 text-sm transition-colors hover:border-brand-300 hover:bg-brand-50 ${
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
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMarkRead(notification.id);
                        }}
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

        {selectedNotification && (
          <div
            className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setSelectedNotification(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`notification-title-${selectedNotification.id}`}
              className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
              ref={notificationDialogRef}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={handleDialogKeyDown}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    id={`notification-title-${selectedNotification.id}`}
                    className="text-lg font-semibold text-slate-900"
                  >
                    {selectedNotification.title}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedNotification.category}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  aria-label="Close notification"
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-700">{selectedNotification.message}</p>
            </div>
          </div>
        )}

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
