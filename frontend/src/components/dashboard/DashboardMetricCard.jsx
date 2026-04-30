import { Link } from "react-router-dom";

import { cn } from "../../lib/utils";

function scrollToAnchor(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      el.focus({ preventScroll: true });
    } catch {
      /* not focusable */
    }
  }
}

const surfaceClass =
  "min-h-[5.5rem] rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.25)]";

const staticHover = "transition duration-200 hover:-translate-y-0.5 hover:border-white/20";

const interactiveHover =
  "cursor-pointer outline-none transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/40 focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

/**
 * Dashboard stat card. Use `to` or `scrollTargetId` / `onActivate` so keyboard and screen-reader users can reach related content.
 */
export function DashboardMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  to,
  scrollTargetId,
  onActivate,
  className,
}) {
  const handleActivate = () => {
    scrollToAnchor(scrollTargetId);
    onActivate?.();
  };

  const hasLink = Boolean(to);
  const hasScrollOrCallback = Boolean(scrollTargetId || onActivate);
  const interactive = hasLink || hasScrollOrCallback;

  const label = `${title}: ${value}. ${subtitle}`;

  const inner = (
    <div className="flex items-start justify-between gap-4 p-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <h3 className="mt-3 text-3xl font-bold text-white">{value}</h3>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300"
        aria-hidden
      >
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );

  const merged = cn(surfaceClass, interactive ? interactiveHover : staticHover, className);

  if (to) {
    return (
      <Link to={to} className={cn(merged, "block")} aria-label={`${label} — open page`}>
        {inner}
      </Link>
    );
  }

  if (hasScrollOrCallback) {
    return (
      <button
        type="button"
        className={cn(merged, "w-full text-left")}
        onClick={handleActivate}
        aria-label={`${label} — go to related section`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={merged} role="region" aria-label={label}>
      {inner}
    </div>
  );
}
