import { useEffect, useState } from "react";
import { LogOut, Menu, Sparkles } from "lucide-react";

import { DashboardTopNav } from "../dashboard/DashboardTopNav";
import { MobileNavDrawer } from "../navigation/MobileNavDrawer";
import { WorkspaceNavPanel } from "../navigation/WorkspaceNavPanel";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

/**
 * Workspace layout: responsive sidebar rail + branded top navigation.
 * `showHistoryBack` adds a themed browser-back control when the route needs it.
 */
function DarkWorkspaceShell({
  children,
  title,
  description,
  workspaceLabel,
  brandSubtitle,
  navItems,
  activeSection,
  onNavSectionSelect,
  user,
  onLogout,
  headerIcon: HeaderIcon = Sparkles,
  actionItems,
  actions,
  topNavClassName,
  showHistoryBack = true,
}) {
  const accentRole = user?.role ? String(user.role) : null;
  const workspaceScope =
    accentRole &&
    ["student", "faculty", "company", "college", "admin"].includes(accentRole)
      ? accentRole
      : null;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLg, setIsLg] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsLg(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const navMenuAriaLabel = isLg
    ? sidebarCollapsed
      ? "Expand sidebar"
      : "Collapse sidebar"
    : "Open navigation menu";

  const onNavMenuClick = () => {
    if (isLg) setSidebarCollapsed((c) => !c);
    else setMobileNavOpen(true);
  };

  const sidebarMenuButtonClass =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] text-slate-700 shadow-sm transition hover:border-[var(--primary)] hover:bg-blue-50/80 hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]";

  return (
    <div
      className={cn(
        "min-h-screen text-[var(--text)]",
        workspaceScope ? "l2h-workspace-canvas" : "bg-[var(--bg-app)]"
      )}
      {...(workspaceScope ? { "data-l2h-workspace": workspaceScope } : {})}
    >
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={cn(
            "hidden w-60 shrink-0 flex-col border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--surface-elevated)]",
            "lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:border-b-0 lg:border-r",
            sidebarCollapsed ? "lg:hidden" : "lg:flex"
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
            <div className="mb-4 flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onNavMenuClick}
                className={sidebarMenuButtonClass}
                aria-label={navMenuAriaLabel}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md shadow-blue-600/25">
                  <HeaderIcon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-slate-900">Learn2Hire</p>
                  <p className="truncate text-xs font-semibold capitalize text-[var(--text-muted)]">
                    {brandSubtitle}
                  </p>
                </div>
              </div>
            </div>

            <WorkspaceNavPanel
              accentRole={accentRole}
              items={navItems}
              collapsed={false}
              activeSection={activeSection}
              onSelectSection={onNavSectionSelect}
              variant="light"
            />

            <div className="mt-auto shrink-0 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="w-full justify-center"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </aside>

        <div
          className={cn(
            "hidden min-h-0 shrink-0 flex-col border-[var(--border)] bg-[var(--bg-card)] shadow-sm",
            "lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:border-b-0 lg:border-r",
            sidebarCollapsed
              ? "lg:flex lg:w-[4.25rem] lg:min-h-0 lg:gap-2 lg:px-2 lg:py-3"
              : "lg:hidden"
          )}
        >
          <div className="flex shrink-0 justify-center">
            <button
              type="button"
              onClick={onNavMenuClick}
              className={sidebarMenuButtonClass}
              aria-label={navMenuAriaLabel}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-1">
            <WorkspaceNavPanel
              accentRole={accentRole}
              items={navItems}
              collapsed
              activeSection={activeSection}
              onSelectSection={onNavSectionSelect}
              variant="light"
            />
          </div>
          <div className="mt-auto flex shrink-0 justify-center border-t border-[var(--border)] pb-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col py-3 sm:py-5">
          <div className="l2h-container-app flex min-w-0 flex-1 flex-col">
            <DashboardTopNav
              bleed
              theme="light"
              workspaceLabel={workspaceLabel}
              title={title}
              description={description}
              user={user}
              onLogout={onLogout}
              showNavMenuButton={!isLg}
              showNavMenuAtLarge={false}
              navMenuLeading={!isLg}
              navMenuAriaLabel={navMenuAriaLabel}
              onNavMenuClick={onNavMenuClick}
              showHistoryBack={showHistoryBack}
              actionItems={actionItems}
              actions={actions}
              className={cn("shrink-0", topNavClassName)}
            />
            <div className="min-w-0 flex-1 pt-1">{children}</div>
          </div>
        </div>
      </div>

      <MobileNavDrawer
        accentRole={accentRole}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        items={navItems}
        brandTitle="Learn2Hire"
        brandSubtitle={brandSubtitle}
        headerIcon={HeaderIcon}
        activeSection={activeSection}
        onSelectSection={onNavSectionSelect}
        onLogout={onLogout}
        breakpoints="mobile"
      />
    </div>
  );
}

export { DarkWorkspaceShell };
