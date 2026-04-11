import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
import { cn } from "../../lib/utils";
import { NavDropdown } from "../ui/nav-dropdown";

const UNREAD_POLL_MS = 45_000;
const NOTIF_TOAST_MS = 5_000;

/** Last unread count at which the user dismissed the bell badge (per login email). */
function notifDismissSnapKey(email) {
  return `learn2hire_notif_dismiss_snap::${email || "anon"}`;
}

function readDismissSnap(email) {
  const raw = sessionStorage.getItem(notifDismissSnapKey(email));
  if (raw === null || raw === "") return -1;
  const n = Number(raw);
  return Number.isFinite(n) ? n : -1;
}

function coerceUnreadCount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function initialsFromName(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Production-style dashboard top bar: brand + title, optional description,
 * module actions, notification icon, account menu with logout.
 *
 * @param {Object} props
 * @param {"dark" | "light"} [props.theme="dark"]
 * @param {string} props.workspaceLabel — small label above title (e.g. "Student Workspace")
 * @param {string} props.title — primary heading
 * @param {string} [props.description] — optional muted line under the title block
 * @param {{ name: string, email?: string, role?: string }} props.user
 * @param {() => void} props.onLogout
 * @param {string} [props.notificationsTo="/notifications"]
 * @param {boolean} [props.showNotifications=true]
 * @param {import("react").ReactNode} [props.actions] — module quick links (wrap in flex gap)
 * @param {{ label: string, to?: string, onClick?: () => void, icon?: import("lucide-react").LucideIcon }[]} [props.actionItems] — 2+ items become a menu; 1 item renders as a toolbar link
 * @param {boolean} [props.bleed=false] — true: extend to edges of a padded main column (sidebar layouts)
 * @param {string} [props.className]
 * @param {boolean} [props.showNavMenuButton=false] — hamburger; toggles workspace nav
 * @param {boolean} [props.showNavMenuAtLarge=false] — when true, keep hamburger visible on `lg+`
 * @param {boolean} [props.navMenuLeading=false] — when true, place the menu control first on the left (before the brand tile)
 * @param {string} [props.navMenuAriaLabel] — accessible name for the menu control
 * @param {boolean} [props.showHistoryBack=false] — themed control that runs browser history back (SPA)
 * @param {() => void} [props.onNavMenuClick]
 */
function DashboardTopNav({
  theme = "dark",
  workspaceLabel,
  title,
  description,
  user,
  onLogout,
  notificationsTo = "/notifications",
  showNotifications = true,
  showNavMenuButton = false,
  showNavMenuAtLarge = false,
  navMenuLeading = false,
  navMenuAriaLabel = "Open navigation menu",
  showHistoryBack = false,
  onNavMenuClick,
  actions = null,
  actionItems = null,
  bleed = false,
  className,
}) {
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const navUserEmail = (user?.email || "").trim();
  const dismissSnapKey = notifDismissSnapKey(navUserEmail);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const toastTimerRef = useRef(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissSnap, setDismissSnap] = useState(() => readDismissSnap(navUserEmail));
  const [notifyToast, setNotifyToast] = useState({ open: false, message: "" });

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setNotifyToast({ open: false, message: "" });
  }, []);

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

      if (n !== null) setUnreadCount(Math.max(0, Math.floor(n)));
    } catch {
      /* ignore polling errors */
    }
  }, []);

  useEffect(() => {
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
  }, [fetchUnreadCount]);

  useEffect(() => {
    setDismissSnap(readDismissSnap(navUserEmail));
  }, [navUserEmail]);

  useEffect(() => {
    setDismissSnap((prev) => {
      const p = Number.isFinite(prev) ? prev : -1;
      const next = Math.min(p, unreadCount);
      if (next !== p) {
        sessionStorage.setItem(dismissSnapKey, String(next));
      }
      return next;
    });
  }, [unreadCount, dismissSnapKey]);

  useEffect(() => () => dismissToast(), [dismissToast]);

  const effectiveDismissSnap = Number.isFinite(dismissSnap) ? dismissSnap : -1;
  const showUnreadDot = unreadCount > 0 && unreadCount > effectiveDismissSnap;

  const openNotifications = useCallback(
    (fromMenu) => {
      if (fromMenu) setMenuOpen(false);
      sessionStorage.setItem(dismissSnapKey, String(unreadCount));
      setDismissSnap(unreadCount);

      if (unreadCount > 0) {
        const message = `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`;
        setNotifyToast({ open: true, message });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          dismissToast();
        }, NOTIF_TOAST_MS);
      } else {
        dismissToast();
      }

      navigate(notificationsTo);
    },
    [dismissSnapKey, dismissToast, navigate, notificationsTo, unreadCount]
  );

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [menuOpen]);

  const displayName = user?.name?.trim() || "Account";
  const displayEmail = user?.email?.trim() || "";
  const displayRole = user?.role ? String(user.role) : "";

  const linkTheme = isDark ? "dark" : "light";

  const renderedToolbar = (() => {
    if (actionItems && actionItems.length > 0) {
      if (actionItems.length === 1) {
        const a = actionItems[0];
        return (
          <ToolbarLink key={a.label} to={a.to} onClick={a.onClick} icon={a.icon} theme={linkTheme}>
            {a.label}
          </ToolbarLink>
        );
      }
      return (
        <NavDropdown
          theme={linkTheme}
          align="right"
          label="Quick actions"
          items={actionItems}
        />
      );
    }
    return actions;
  })();

  const navMenuButton =
    showNavMenuButton && onNavMenuClick ? (
      <button
        type="button"
        onClick={onNavMenuClick}
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition",
          !showNavMenuAtLarge && !navMenuLeading && "lg:hidden",
          isDark
            ? "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
        )}
        aria-label={navMenuAriaLabel}
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
    ) : null;

  const historyBackButton = showHistoryBack ? (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition",
        isDark
          ? "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/35 hover:bg-white/10 hover:text-white"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-white hover:text-slate-900"
      )}
      aria-label="Go back"
      title="Back"
    >
      <ArrowLeft className="h-5 w-5" aria-hidden />
    </button>
  ) : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 mb-6 border-b backdrop-blur-xl",
        isDark &&
          (bleed
            ? "-mx-3 border-white/10 bg-slate-950/80 px-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)] sm:-mx-4 sm:px-4"
            : "border-white/10 bg-slate-950/80 px-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] sm:px-4"),
        !isDark &&
          "border-slate-200/90 bg-white/95 px-3 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] sm:px-4",
        className
      )}
    >
      <div className="py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            {navMenuLeading ? navMenuButton : null}
            {showHistoryBack ? historyBackButton : null}
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg sm:h-12 sm:w-12",
                isDark
                  ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-900/40"
                  : "bg-indigo-600 text-white shadow-indigo-600/20"
              )}
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.18em]",
                    isDark ? "text-cyan-300/90" : "text-indigo-600"
                  )}
                >
                  Learn2Hire
                </p>
                <span
                  className={cn("hidden h-3 w-px sm:block", isDark ? "bg-white/15" : "bg-slate-300")}
                  aria-hidden
                />
                <p
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-wider",
                    isDark ? "text-slate-500" : "text-slate-500"
                  )}
                >
                  {workspaceLabel}
                </p>
                {displayRole ? (
                  <span
                    className={cn(
                      "inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize leading-none tracking-wide",
                      isDark
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    )}
                  >
                    {displayRole}
                  </span>
                ) : null}
              </div>
              <h1
                className={cn(
                  "mt-1.5 truncate text-xl font-semibold tracking-tight sm:text-2xl",
                  isDark ? "text-white" : "text-slate-900"
                )}
              >
                {title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end lg:shrink-0">
            {!navMenuLeading ? navMenuButton : null}
            {renderedToolbar ? (
              <div
                className={cn(
                  "flex max-w-full flex-1 flex-wrap items-center gap-2 sm:flex-none lg:max-w-none",
                  isDark
                    ? "rounded-xl border border-white/10 bg-slate-900/40 p-1.5 sm:rounded-lg sm:p-1"
                    : "rounded-lg border border-slate-200 bg-slate-50/90 p-1"
                )}
              >
                {renderedToolbar}
              </div>
            ) : null}

            {showNotifications ? (
              <button
                type="button"
                onClick={() => openNotifications(false)}
                className={cn(
                  "relative z-0 inline-flex h-10 w-10 items-center justify-center overflow-visible rounded-lg border transition",
                  isDark
                    ? "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
                )}
                aria-label={
                  unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
                }
              >
                <Bell className="h-[18px] w-[18px]" aria-hidden />
                {showUnreadDot ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute -right-0.5 -top-0.5 z-10 h-2.5 w-2.5 rounded-full border-2 border-red-600 bg-red-500 shadow-sm shadow-red-900/50",
                      isDark ? "border-slate-950" : "border-white"
                    )}
                    aria-hidden
                  />
                ) : null}
              </button>
            ) : null}

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  "flex h-10 max-w-[min(100vw-2rem,280px)] items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition sm:h-10 sm:max-w-[260px] sm:px-2.5",
                  isDark
                    ? "border-white/10 bg-slate-900/50 text-white hover:border-white/20 hover:bg-slate-900/80"
                    : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
                )}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                    isDark
                      ? "bg-indigo-500/25 text-indigo-100 ring-1 ring-white/10"
                      : "bg-indigo-100 text-indigo-800"
                  )}
                >
                  {initialsFromName(displayName)}
                </span>
                <span className="min-w-0 flex-1 max-sm:hidden">
                  <span
                    className={cn(
                      "block truncate text-sm font-semibold leading-tight",
                      isDark ? "text-white" : "text-slate-900"
                    )}
                  >
                    {displayName}
                  </span>
                  {displayEmail ? (
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-xs leading-tight",
                        isDark ? "text-slate-400" : "text-slate-500"
                      )}
                    >
                      {displayEmail}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 opacity-60 transition max-sm:hidden",
                    menuOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>

              {menuOpen ? (
                <div
                  className={cn(
                    "absolute right-0 mt-2 w-64 origin-top-right rounded-xl border py-2 shadow-xl",
                    isDark
                      ? "border-white/10 bg-slate-950 ring-1 ring-black/40"
                      : "border-slate-200 bg-white shadow-slate-200/80"
                  )}
                  role="menu"
                >
                  <div
                    className={cn(
                      "border-b px-3 pb-2 sm:hidden",
                      isDark ? "border-white/10" : "border-slate-100"
                    )}
                  >
                    <p className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "")}>
                      {displayName}
                    </p>
                    {displayEmail ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{displayEmail}</p>
                    ) : null}
                  </div>
                  <Link
                    to="/dashboard"
                    role="menuitem"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition",
                      isDark ? "text-slate-200 hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    <LayoutDashboard
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isDark ? "text-cyan-300/90" : "text-indigo-600"
                      )}
                      aria-hidden
                    />
                    Dashboard home
                  </Link>
                  {showNotifications ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition",
                        isDark ? "text-slate-200 hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => openNotifications(true)}
                    >
                      <span className="relative inline-flex shrink-0">
                        <Bell
                          className={cn(
                            "h-4 w-4",
                            isDark ? "text-cyan-300/90" : "text-indigo-600"
                          )}
                          aria-hidden
                        />
                        {showUnreadDot ? (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500"
                            aria-hidden
                          />
                        ) : null}
                      </span>
                      Notifications
                    </button>
                  ) : null}
                  <div
                    className={cn("mx-2 my-1 h-px", isDark ? "bg-white/10" : "bg-slate-100")}
                    aria-hidden
                  />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition",
                      isDark
                        ? "text-rose-300 hover:bg-white/5"
                        : "text-rose-600 hover:bg-rose-50"
                    )}
                  >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {description ? (
          <p
            className={cn(
              "mt-4 max-w-3xl text-sm leading-relaxed lg:mt-3",
              isDark ? "text-slate-400" : "text-slate-600"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {notifyToast.open ? (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-[100] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl",
            isDark
              ? "border-white/10 bg-slate-900 text-slate-100 ring-1 ring-black/50"
              : "border-slate-200 bg-white text-slate-900 shadow-slate-900/10"
          )}
          role="status"
        >
          <Bell
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              isDark ? "text-cyan-300/90" : "text-indigo-600"
            )}
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-sm leading-snug">{notifyToast.message}</p>
          <button
            type="button"
            onClick={dismissToast}
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-xs font-semibold transition",
              isDark
                ? "text-slate-300 hover:bg-white/10 hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </header>
  );
}

/** Compact toolbar control; matches parent dashboard theme. */
function ToolbarLink({ to, children, icon: Icon, onClick, theme: linkTheme = "dark" }) {
  const isLinkDark = linkTheme === "dark";
  const className = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
    isLinkDark
      ? "border border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {Icon ? (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              isLinkDark ? "text-cyan-300/80" : "text-indigo-600"
            )}
            aria-hidden
          />
        ) : null}
        <span className="whitespace-nowrap">{children}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {Icon ? (
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            isLinkDark ? "text-cyan-300/80" : "text-indigo-600"
          )}
          aria-hidden
        />
      ) : null}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

DashboardTopNav.ToolbarLink = ToolbarLink;

export { DashboardTopNav };
