import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "../../lib/utils";

/**
 * Small anchored menu for toolbar / page actions.
 *
 * @param {Object} props
 * @param {"dark" | "light"} [props.theme="dark"]
 * @param {"left" | "right"} [props.align="right"]
 * @param {string} props.label
 * @param {import("lucide-react").LucideIcon} [props.icon]
 * @param {Array<{ key?: string, label: string, to?: string, onClick?: () => void, icon?: import("lucide-react").LucideIcon, destructive?: boolean }>} props.items
 * @param {string} [props.className] — extra classes on the trigger button
 * @param {string} [props.menuClassName] — extra classes on the menu panel
 */
export function NavDropdown({
  theme = "dark",
  align = "right",
  label,
  icon: Icon,
  items,
  className,
  menuClassName,
}) {
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const rowBase = cn(
    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition",
    isDark ? "text-slate-50 hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"
  );

  const rowDestructive = isDark
    ? "text-rose-200 hover:bg-white/10"
    : "text-rose-600 hover:bg-rose-50";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
          isDark
            ? "border-white/15 bg-white/[0.08] text-slate-50 hover:border-cyan-400/35 hover:bg-white/12 hover:text-white"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          className
        )}
      >
        {Icon ? (
          <Icon
            className={cn("h-4 w-4 shrink-0", isDark ? "text-cyan-200" : "text-indigo-600")}
            aria-hidden
          />
        ) : null}
        <span className="max-w-[180px] truncate sm:max-w-none">{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-current opacity-90 transition", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 mt-2 min-w-[220px] rounded-xl border py-1 shadow-xl",
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
            isDark
              ? "border-white/10 bg-slate-950 ring-1 ring-black/40"
              : "border-slate-200 bg-white shadow-slate-200/60",
            menuClassName
          )}
          role="menu"
        >
          {items.map((item, i) => {
            if (item.separator) {
              return (
                <div
                  key={`sep-${i}`}
                  className={cn(
                    "my-1 h-px",
                    isDark ? "bg-white/10" : "bg-slate-100"
                  )}
                  role="separator"
                />
              );
            }

            const key = item.key ?? item.to ?? `${item.label}-${i}`;
            const row = cn(
              rowBase,
              item.destructive && rowDestructive,
              item.disabled && "pointer-events-none opacity-60"
            );

            if (item.to) {
              return (
                <Link
                  key={key}
                  to={item.to}
                  role="menuitem"
                  className={row}
                  aria-disabled={item.disabled || undefined}
                  onClick={() => {
                    if (item.disabled) return;
                    setOpen(false);
                  }}
                >
                  {item.icon ? (
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        item.destructive
                          ? ""
                          : isDark
                            ? "text-cyan-200"
                            : "text-indigo-600"
                      )}
                      aria-hidden
                    />
                  ) : null}
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={row}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {item.icon ? (
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      item.destructive ? "" : isDark ? "text-cyan-200" : "text-indigo-600"
                    )}
                    aria-hidden
                  />
                ) : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
