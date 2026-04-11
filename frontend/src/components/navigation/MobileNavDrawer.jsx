import { X } from "lucide-react";

import { Button } from "../ui/button";
import { WorkspaceNavPanel } from "./WorkspaceNavPanel";

/**
 * Full-height slide-in nav.
 * @param {"mobile" | "all"} [props.breakpoints="mobile"] — `mobile`: hidden on lg+ (dashboard hamburger is lg-only). `all`: also for Jobs / Notifications on desktop.
 */
function MobileNavDrawer({
  open,
  onClose,
  items,
  brandTitle,
  brandSubtitle,
  activeSection,
  onSelectSection,
  onLogout,
  headerIcon: HeaderIcon,
  breakpoints = "mobile",
}) {
  if (!open) return null;

  const bpClass = breakpoints === "all" ? "" : "lg:hidden";

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm ${bpClass}`}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(100vw-3rem,20rem)] flex-col border-r border-white/10 bg-slate-950 shadow-2xl shadow-black/50 ${bpClass}`}
        role="dialog"
        aria-modal="true"
        aria-label="Workspace navigation"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex min-w-0 items-center gap-3">
            {HeaderIcon ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                <HeaderIcon className="h-5 w-5" aria-hidden />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{brandTitle}</p>
              <p className="truncate text-xs text-slate-500">{brandSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          <WorkspaceNavPanel
            items={items}
            collapsed={false}
            activeSection={activeSection}
            onSelectSection={onSelectSection}
            onItemClick={onClose}
          />
        </div>

        <div className="border-t border-white/10 p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full justify-center border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}

export { MobileNavDrawer };
