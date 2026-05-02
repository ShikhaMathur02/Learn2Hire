import { Link, useLocation } from "react-router-dom";

import { cn } from "../../lib/utils";

/** Left rail accent keyed by authenticated role (`user.role`). */
const ACCENT_RAIL = {
  student: "border-l-emerald-500",
  college: "border-l-slate-500",
  faculty: "border-l-violet-600",
  admin: "border-l-[color:var(--admin)]",
  company: "border-l-teal-600",
};

/**
 * Sidebar / drawer nav list for workspace dashboards.
 */
function WorkspaceNavPanel({
  items,
  collapsed = false,
  accentRole,
  activeSection,
  onSelectSection,
  onItemClick,
  variant = "light",
}) {
  const { pathname } = useLocation();

  const isDark = variant === "dark";
  const railAccent = accentRole && ACCENT_RAIL[accentRole] ? ACCENT_RAIL[accentRole] : "border-l-blue-600";

  const isItemActive = (item) => {
    if (item.path) {
      if (pathname === item.path) return true;
      if (item.path === "/jobs" && pathname.startsWith("/jobs")) return true;
      if (item.path === "/dashboard/learning/manage") {
        return (
          pathname === "/dashboard/learning/manage" ||
          pathname.startsWith("/dashboard/learning/manage/")
        );
      }
      return false;
    }
    return activeSection === item.id;
  };

  const linkClass = (active) => {
    if (isDark) {
      return cn(
        "flex w-full shrink-0 items-center gap-3 text-left text-sm font-medium transition duration-150",
        collapsed ? "justify-center rounded-xl px-2 py-2.5" : "rounded-2xl px-4 py-3",
        active
          ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "text-slate-200 hover:bg-white/[0.08] hover:text-white"
      );
    }

    return cn(
        "flex w-full shrink-0 items-center gap-3 text-left text-sm font-medium transition duration-150",
        collapsed ? "justify-center rounded-[10px] px-2 py-2.5" : "rounded-[10px] px-3.5 py-3",
        active
        ? collapsed
          ? "border border-slate-200 bg-blue-50 text-[var(--primary)] shadow-sm"
          : cn(
              "border border-slate-100 border-l-[3px] bg-[#f8faff] font-semibold text-[var(--primary)] shadow-sm",
              railAccent
            )
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    );
  };

  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto pb-2",
        collapsed ? "gap-1.5 px-1" : "gap-1.5 pr-1"
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item);
        const cls = linkClass(active);

        if (item.path) {
          return (
            <Link
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              onClick={onItemClick}
              className={cls}
            >
              <Icon
                className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-[18px] w-[18px]")}
                aria-hidden
              />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            title={collapsed ? item.label : undefined}
            onClick={() => {
              onSelectSection?.(item.id);
              onItemClick?.();
            }}
            className={cls}
          >
            <Icon
              className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-[18px] w-[18px]")}
              aria-hidden
            />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}

export { WorkspaceNavPanel };
