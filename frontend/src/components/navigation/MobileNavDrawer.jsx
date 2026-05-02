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
  accentRole,
}) {
  if (!open) return null;

  const bpClass = breakpoints === "all" ? "" : "lg:hidden";

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm ${bpClass}`}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(100vw-3rem,20rem)] flex-col border-r border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--surface-elevated)] ${bpClass}`}
        role="dialog"
        aria-modal="true"
        aria-label="Workspace navigation"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <div className="flex min-w-0 items-center gap-3">
            {HeaderIcon ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md shadow-blue-600/20">
                <HeaderIcon className="h-5 w-5" aria-hidden />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">{brandTitle}</p>
              <p className="truncate text-xs font-medium capitalize text-slate-500">{brandSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          <WorkspaceNavPanel
            accentRole={accentRole}
            items={items}
            collapsed={false}
            activeSection={activeSection}
            onSelectSection={onSelectSection}
            onItemClick={onClose}
            variant="light"
          />
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full justify-center"
          >
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}

export { MobileNavDrawer };
