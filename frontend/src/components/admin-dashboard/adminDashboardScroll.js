/** Persist scroll when opening admin profile/campus routes so browser "back" returns to the same place. */
export const ADMIN_DASHBOARD_SCROLL_KEY = "learn2hire_admin_dashboard_scroll";
export const ADMIN_DASHBOARD_SCROLL_MAX_AGE_MS = 5 * 60 * 1000;

export function saveAdminDashboardScrollBeforeNavigate() {
  try {
    sessionStorage.setItem(
      ADMIN_DASHBOARD_SCROLL_KEY,
      JSON.stringify({ y: window.scrollY, t: Date.now() })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readAndClearAdminDashboardScroll() {
  try {
    const raw = sessionStorage.getItem(ADMIN_DASHBOARD_SCROLL_KEY);
    sessionStorage.removeItem(ADMIN_DASHBOARD_SCROLL_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.y !== "number" || typeof p?.t !== "number") return null;
    if (Date.now() - p.t > ADMIN_DASHBOARD_SCROLL_MAX_AGE_MS) return null;
    return Math.max(0, p.y);
  } catch {
    return null;
  }
}
