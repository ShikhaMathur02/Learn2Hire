import { useId } from "react";

import { cn } from "../../lib/utils";

/**
 * File input with a clearly visible “Choose file” control (uses Tailwind `file:` styles).
 */
export function VisibleFileInput({
  id,
  label,
  labelClassName,
  hint,
  accept,
  onChange,
  disabled,
  className,
  inputClassName,
}) {
  const uid = useId();
  const inputId = id || `file-${uid.replace(/:/g, "")}`;

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <label
          htmlFor={inputId}
          className={cn("mb-2 block text-sm font-medium text-[var(--text-muted)]", labelClassName)}
        >
          {label}
        </label>
      ) : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-950/5">
        <input
          id={inputId}
          type="file"
          disabled={disabled}
          accept={accept}
          onChange={onChange}
          className={cn(
            "block w-full cursor-pointer text-sm leading-7 text-slate-700",
            "file:mr-4 file:inline-flex file:cursor-pointer file:rounded-xl file:border-0 file:bg-blue-600 file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-white file:shadow-md file:outline-none file:transition-colors hover:file:bg-blue-700",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            inputClassName
          )}
        />
      </div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}
