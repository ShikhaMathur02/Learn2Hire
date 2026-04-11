import { useEffect, useState } from "react";
import { LogOut, Menu, Sparkles } from "lucide-react";

import { DashboardTopNav } from "../dashboard/DashboardTopNav";
import { MobileNavDrawer } from "../navigation/MobileNavDrawer";
import { WorkspaceNavPanel } from "../navigation/WorkspaceNavPanel";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

/**
 * Workspace layout: left sidebar visible by default on large screens; the fold control
 * (three lines) sits on the sidebar — header when expanded, slim left rail when collapsed.
 * Below `lg`, the same control lives in the main top bar and opens the drawer.
 * `showHistoryBack` adds a themed browser-back control (disable when the page already exposes a dedicated back action).
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
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={cn(
            "hidden w-64 shrink-0 flex-col border-white/10 bg-slate-950/50 backdrop-blur",
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
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                  <HeaderIcon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">Learn2Hire</p>
                  <p className="truncate text-sm text-slate-500">{brandSubtitle}</p>
                </div>
              </div>
            </div>

            <WorkspaceNavPanel
              items={navItems}
              collapsed={false}
              activeSection={activeSection}
              onSelectSection={onNavSectionSelect}
            />

            <div className="mt-auto shrink-0 border-t border-white/10 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="w-full justify-center border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </aside>

        <div
          className={cn(
            "hidden min-h-0 shrink-0 flex-col border-white/10 bg-slate-950/50 backdrop-blur",
            "lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:border-b-0 lg:border-r",
            sidebarCollapsed
              ? "lg:flex lg:w-16 lg:min-h-0 lg:gap-2 lg:px-2 lg:py-3"
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <WorkspaceNavPanel
              items={navItems}
              collapsed
              activeSection={activeSection}
              onSelectSection={onNavSectionSelect}
            />
          </div>
          <div className="mt-auto flex shrink-0 justify-center border-t border-white/10 pt-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              className="border-white/20 bg-white/5 !text-white shadow-none hover:bg-white/10 hover:!text-white focus-visible:ring-cyan-400/40 focus-visible:ring-offset-0"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <DashboardTopNav
            bleed
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
            className={topNavClassName}
          />
          {children}
        </div>
      </div>

      <MobileNavDrawer
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
