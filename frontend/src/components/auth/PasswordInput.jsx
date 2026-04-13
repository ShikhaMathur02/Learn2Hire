import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "../../lib/utils";

/**
 * Password field with a show/hide control (click the eye icon).
 */
function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  disabled,
  className,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className={cn(className, "pr-10")}
      />
      <button
        type="button"
        className={cn(
          "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 outline-none transition",
          "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
          "focus-visible:ring-2 focus-visible:ring-indigo-500/30",
          "disabled:pointer-events-none disabled:opacity-40"
        )}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        disabled={disabled}
      >
        {visible ? <EyeOff className="h-4 w-4 shrink-0" aria-hidden /> : <Eye className="h-4 w-4 shrink-0" aria-hidden />}
      </button>
    </div>
  );
}

export default PasswordInput;
