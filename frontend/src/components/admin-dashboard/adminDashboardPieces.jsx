import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";

export function MetricCard({ title, value, subtitle, icon: Icon, className, onClick }) {
  const interactive = typeof onClick === "function";
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--surface-elevated)] ring-1 ring-black/[0.04] backdrop-blur-sm transition hover:border-[color:var(--primary)]/45 hover:shadow-xl",
        interactive &&
          "cursor-pointer hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={interactive ? `View ${title}: ${subtitle}` : undefined}
    >
      <div className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full bg-[var(--primary)]/10 blur-2xl transition duration-500 group-hover:bg-[var(--primary)]/15" />
      <CardContent className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {title}
            </p>
            <h3 className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-[var(--text)] sm:text-4xl">
              {value}
            </h3>
            <p className="mt-2 text-sm leading-snug text-[var(--text-muted)]">{subtitle}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[var(--primary)] ring-1 ring-slate-950/[0.04]">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DirectorySection({ icon: Icon, eyebrow, title, description, children }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/96 p-5 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] backdrop-blur-md sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--primary)]/25 to-transparent" />
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[var(--primary)] ring-1 ring-slate-950/[0.04]">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
          <div>
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-0.5 text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              {description}
            </p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

export function CollapsibleSection({ title, subtitle, badge, defaultOpen = false, sectionId, children }) {
  const location = useLocation();
  const hash = (location.hash || "").replace(/^#/, "");
  const matchHash = Boolean(sectionId && hash === sectionId);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (matchHash) setOpen(true);
  }, [matchHash]);

  useEffect(() => {
    if (!matchHash || !sectionId) return undefined;
    const t = window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 320);
    return () => window.clearTimeout(t);
  }, [matchHash, sectionId]);

  return (
    <div
      id={sectionId}
      className="scroll-mt-28 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/96 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] backdrop-blur-md"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6 sm:py-5"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-[var(--text)] sm:text-xl">{title}</h2>
            {badge != null && badge !== "" ? (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-950">
                {badge}
              </span>
            ) : null}
          </div>
          {subtitle ? <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--text-muted)] transition duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-[var(--border)] px-5 pb-5 pt-1 sm:px-6">{children}</div>
      ) : null}
    </div>
  );
}
