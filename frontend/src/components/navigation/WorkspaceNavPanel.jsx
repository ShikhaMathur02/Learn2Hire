import { Link, useLocation } from "react-router-dom";

import { cn } from "../../lib/utils";

/**
 * Shared sidebar / drawer nav list for workspace dashboards.
 *
 * @param {Object} props
 * @param {{ id: string, label: string, icon: import("lucide-react").LucideIcon, path?: string }[]} props.items
 * @param {boolean} [props.collapsed=false] — icon-only rail (desktop)
 * @param {string} [props.activeSection] — in-dashboard section id
 * @param {(id: string) => void} [props.onSelectSection]
 * @param {() => void} [props.onItemClick] — e.g. close mobile drawer
 */
function WorkspaceNavPanel({
  items,
  collapsed = false,
  activeSection,
  onSelectSection,
  onItemClick,
}) {
  const { pathname } = useLocation();

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

  const itemClass = (active) =>
    cn(
      "flex w-full shrink-0 items-center gap-3 text-left text-sm font-medium transition",
      collapsed ? "justify-center rounded-xl px-2 py-2.5" : "rounded-2xl px-4 py-3",
      active
        ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    );

  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto pb-2",
        collapsed ? "gap-1.5" : "gap-2"
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item);

        if (item.path) {
          return (
            <Link
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              onClick={onItemClick}
              className={itemClass(active)}
            >
              <Icon
                className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")}
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
            className={itemClass(active)}
          >
            <Icon
              className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")}
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
