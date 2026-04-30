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
          className={cn("mb-2 block text-sm font-medium text-slate-200", labelClassName)}
        >
          {label}
        </label>
      ) : null}
      <div className="rounded-2xl border border-slate-400/40 bg-slate-700/50 p-4 shadow-inner shadow-slate-950/20 ring-1 ring-white/15">
        <input
          id={inputId}
          type="file"
          disabled={disabled}
          accept={accept}
          onChange={onChange}
          className={cn(
            "block w-full cursor-pointer text-sm leading-7 text-slate-100",
            "file:mr-4 file:inline-flex file:cursor-pointer file:rounded-xl file:border-0 file:bg-indigo-600 file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-white file:shadow-md file:outline-none file:transition-colors hover:file:bg-indigo-500",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/70",
            "disabled:cursor-not-allowed disabled:opacity-50",
            inputClassName
          )}
        />
      </div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-slate-400">{hint}</p> : null}
    </div>
  );
}
