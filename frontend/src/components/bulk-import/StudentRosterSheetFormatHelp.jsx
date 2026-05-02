import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

import {
  STUDENT_ROSTER_IMPORT_HEADERS,
} from "../../lib/studentRosterImportFormat";
import { Button } from "../ui/button";

/**
 * Opens an accessible modal explaining required roster spreadsheet columns
 * (college / faculty / admin campus import).
 */
export function StudentRosterSheetFormatHelp({ className, triggerLabel = "Spreadsheet format" }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="custom"
        size="sm"
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Info className="size-4 shrink-0 opacity-90" aria-hidden />
        {triggerLabel}
      </Button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" aria-hidden />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-slate-900 px-6 pb-6 pt-7 text-slate-200 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65)] sm:px-7 sm:pb-7 sm:pt-8"
              >
                <h2 id={titleId} className="text-lg font-semibold text-white">
                  Spreadsheet column format
                </h2>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-sky-200/95">
                  Column order (recommended)
                </p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-200">
                  {STUDENT_ROSTER_IMPORT_HEADERS.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ol>
                <p className="mt-4 text-sm leading-snug text-slate-300">
                  Aliases work (e.g. Email, Phone, Dept).{" "}
                  <strong className="font-semibold text-slate-100">Email id</strong> and matching cohort values are
                  required for each data row.
                </p>
                <p className="mt-4 text-xs leading-relaxed text-slate-400">
                  Defaults and import rules are described on the bulk import card behind this dialog.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="custom"
                    className="!border-white/20 !text-slate-200 hover:!bg-white/10"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
