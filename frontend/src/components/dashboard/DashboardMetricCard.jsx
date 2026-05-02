import { Link } from "react-router-dom";

import { scrollToElementId } from "../../lib/scrollAnchor";
import { cn } from "../../lib/utils";

const surfaceClass =
  "rounded-[10px] border border-slate-400/35 bg-[var(--bg-card)] shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.06] backdrop-blur-[2px]";

const staticHover = "transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--primary)]/55";

const interactiveHover =
  "cursor-pointer outline-none transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary-dark)] hover:shadow-[var(--surface-elevated),0_20px_50px_-20px_rgba(15,23,42,0.18)] hover:ring-slate-950/10 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)]";

const titleSlotClass =
  "break-words text-pretty text-[0.9375rem] font-bold leading-snug tracking-tight text-[var(--text)]";

const subtitleSlotClass =
  "break-words text-pretty text-sm font-semibold leading-relaxed tracking-tight text-slate-800";

const metricValueClass =
  "break-words text-[1.675rem] font-extrabold tabular-nums tracking-tighter text-[var(--text)] sm:text-4xl sm:leading-none";

/**
 * Dashboard stat card.
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
    scrollToElementId(scrollTargetId);
    onActivate?.();
  };

  const hasLink = Boolean(to);
  const hasScrollOrCallback = Boolean(scrollTargetId || onActivate);
  const interactive = hasLink || hasScrollOrCallback;

  const label = `${title}: ${value}. ${subtitle}`;

  const inner = (
    <div className="flex min-h-0 w-full flex-1 flex-row items-stretch gap-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
        <p className={titleSlotClass}>{title}</p>
        <div className="flex min-h-[2.5rem] shrink-0 flex-col justify-center py-2">
          <h3 className={metricValueClass}>{value}</h3>
        </div>
        <p className={subtitleSlotClass}>{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center justify-center self-stretch pl-1" aria-hidden>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-white/95 text-[var(--primary-dark)] shadow-sm ring-[1.5px] ring-slate-400/55">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  const merged = cn(
    surfaceClass,
    interactive ? interactiveHover : staticHover,
    "flex min-h-fit h-full flex-col self-stretch",
    className
  );

  const bodyPad = "p-5 sm:p-6";

  if (to) {
    return (
      <Link to={to} className={merged} aria-label={`${label} — open page`}>
        <span className={cn("flex min-h-0 flex-1 flex-col", bodyPad)}>
          {inner}
        </span>
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
        <span className={cn("flex min-h-0 flex-1 flex-col", bodyPad)}>
          {inner}
        </span>
      </button>
    );
  }

  return (
    <div className={merged} role="region" aria-label={label}>
      <span className={cn("flex min-h-0 flex-1 flex-col", bodyPad)}>
        {inner}
      </span>
    </div>
  );
}
