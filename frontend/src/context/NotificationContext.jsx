import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { readApiResponse } from "../lib/api";
import { useAuthSession } from "../lib/authSession";
import { cn } from "../lib/utils";

const UNREAD_POLL_MS = 30_000;
const NOTIF_TOAST_MS = 6_000;

function coerceUnreadCount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function sessionInitialToastKey(email) {
  return `learn2hire_notif_session_toast::${email || "anon"}`;
}

const NotificationContext = createContext(null);

/** Layouts that already include `DashboardTopNav` (avoid duplicate floating bell on route transitions). */
function pathHasWorkspaceNotificationBell(pathname) {
  if (pathname === "/jobs" || pathname.startsWith("/jobs/")) return true;
  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) return true;
  return false;
}

function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

/**
 * Polling, unread badge state, toast when new unread arrive, and floating bell on pages without DashboardTopNav.
 */
function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (user?.email || "").trim();

  const [unreadCount, setUnreadCount] = useState(0);
  const [topNavMounts, setTopNavMounts] = useState(0);
  const [notifyToast, setNotifyToast] = useState({ open: false, message: "" });
  const toastTimerRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const initialHandledForEmailRef = useRef(null);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setNotifyToast({ open: false, message: "" });
  }, []);

  const showToast = useCallback(
    (message) => {
      setNotifyToast({ open: true, message });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        dismissToast();
      }, NOTIF_TOAST_MS);
    },
    [dismissToast]
  );

  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const htmlMsg =
      "Notifications API returned HTML instead of JSON. Restart the backend server and refresh the page.";

    try {
      let response = await fetch("/api/notifications/unread-count", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      let data = await readApiResponse(response, htmlMsg);

      if (response.status === 401) return;

      let n = coerceUnreadCount(data?.data?.unreadCount);
      if (n === null) n = coerceUnreadCount(data?.unreadCount);

      if (!response.ok || n === null) {
        response = await fetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        data = await readApiResponse(response, htmlMsg);
        if (response.status === 401 || !response.ok) return;
        n = coerceUnreadCount(data?.data?.unreadCount);
        if (n === null) n = coerceUnreadCount(data?.unreadCount);
      }

      if (n === null) return;
      const next = Math.max(0, Math.floor(n));

      const prevN = prevUnreadRef.current;
      if (prevN === null) {
        if (next > 0) {
          const key = sessionInitialToastKey(email);
          if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            showToast(
              `You have ${next} unread notification${next === 1 ? "" : "s"}. Open the bell to review.`
            );
          }
        }
      } else if (next > prevN) {
        const added = next - prevN;
        showToast(
          added === 1 ? "You have a new notification." : `You have ${added} new notifications.`
        );
      }

      prevUnreadRef.current = next;
      setUnreadCount(next);
    } catch {
      /* ignore polling errors */
    }
  }, [email, showToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      prevUnreadRef.current = null;
      initialHandledForEmailRef.current = null;
      setUnreadCount(0);
      dismissToast();
      return undefined;
    }

    if (initialHandledForEmailRef.current !== email) {
      initialHandledForEmailRef.current = email;
      prevUnreadRef.current = null;
    }

    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, UNREAD_POLL_MS);
    const onFocus = () => fetchUnreadCount();
    const onVis = () => {
      if (document.visibilityState === "visible") fetchUnreadCount();
    };
    const onNotifChanged = () => fetchUnreadCount();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("learn2hire-notifications-changed", onNotifChanged);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("learn2hire-notifications-changed", onNotifChanged);
    };
  }, [isAuthenticated, email, fetchUnreadCount, dismissToast]);

  const registerTopNavMount = useCallback(() => {
    setTopNavMounts((c) => c + 1);
    return () => setTopNavMounts((c) => Math.max(0, c - 1));
  }, []);

  const showUnreadDot = unreadCount > 0;
  const shellHasBell = pathHasWorkspaceNotificationBell(location.pathname);
  const showFloatingBell =
    isAuthenticated && topNavMounts === 0 && !shellHasBell;

  const openNotifications = useCallback(
    (to = "/notifications") => {
      dismissToast();
      navigate(to);
    },
    [dismissToast, navigate]
  );

  const value = useMemo(
    () => ({
      unreadCount,
      showUnreadDot,
      fetchUnreadCount,
      registerTopNavMount,
      dismissNotifyToast: dismissToast,
    }),
    [unreadCount, showUnreadDot, fetchUnreadCount, registerTopNavMount, dismissToast]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {showFloatingBell ? (
        <FloatingNotificationBell
          unreadCount={unreadCount}
          showUnreadDot={showUnreadDot}
          onOpen={() => openNotifications("/notifications")}
        />
      ) : null}
      {notifyToast.open ? (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-[100] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl",
            "border-white/10 bg-slate-900 text-slate-100 ring-1 ring-black/50"
          )}
          role="status"
        >
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300/90" aria-hidden />
          <p className="min-w-0 flex-1 text-sm leading-snug">{notifyToast.message}</p>
          <button
            type="button"
            onClick={dismissToast}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </NotificationContext.Provider>
  );
}

function FloatingNotificationBell({ unreadCount, showUnreadDot, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "fixed right-4 top-16 z-[90] inline-flex h-11 w-11 items-center justify-center overflow-visible rounded-xl border border-white/15 bg-slate-950/90 text-slate-200 shadow-lg backdrop-blur transition hover:border-cyan-400/35 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
      )}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      title="Notifications"
    >
      <Bell className="h-[19px] w-[19px]" aria-hidden />
      {showUnreadDot ? (
        <span
          className="pointer-events-none absolute -right-0.5 -top-0.5 z-10 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-red-500 shadow-sm shadow-red-900/50"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

function useNotifications() {
  return useNotificationContext();
}

export { NotificationProvider, useNotifications };
