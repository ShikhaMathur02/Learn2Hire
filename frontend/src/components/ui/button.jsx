import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "../../lib/utils";

/**
 * Standard control (matches dashboard header “Notifications” / “Logout”):
 * white face, thin indigo border, indigo label, ~10px radius, fixed height; hover → solid indigo + white label.
 */
const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold leading-none no-underline transition-[color,background-color,border-color,box-shadow] disabled:pointer-events-none disabled:opacity-[0.72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:brightness-[0.97]";

const standardOutline =
  "border border-indigo-600 bg-white !text-indigo-700 shadow-sm hover:bg-indigo-600 hover:!text-white hover:border-indigo-600";

const variantClasses = {
  /** Default — outlined indigo (header / login-style) */
  default: standardOutline,
  /** Alias for default */
  outline: standardOutline,
  /**
   * Low emphasis on light backgrounds — gray border; still warms to indigo on hover.
   */
  soft: "border border-slate-300 bg-white !text-slate-700 shadow-sm hover:border-indigo-600 hover:!text-indigo-700 hover:bg-indigo-50",
  /** Destructive — same shape, rose */
  destructive:
    "border border-rose-600 bg-white !text-rose-600 shadow-sm hover:bg-rose-600 hover:!text-white hover:border-rose-600",
  /** Success — same shape, emerald */
  success:
    "border border-emerald-600 bg-white !text-emerald-800 shadow-sm hover:bg-emerald-600 hover:!text-white hover:border-emerald-600",
  /**
   * Landing role cards: you provide border/text/hover fill via `className`
   * (keeps layout + focus ring only from this component).
   */
  custom: "",
};

/** One height everywhere (40px): header buttons, tables, forms. Icon = square control. */
const sizeClasses = {
  sm: "h-10 min-h-10 px-4 text-sm [&_svg]:size-4",
  default: "h-10 min-h-10 px-4 text-sm [&_svg]:size-4",
  lg: "h-10 min-h-10 px-5 text-sm [&_svg]:size-4",
  xl: "h-10 min-h-10 px-5 text-sm [&_svg]:size-4",
  icon: "h-10 w-10 min-h-10 shrink-0 p-0 gap-0 [&_svg]:size-4",
};

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  const v =
    typeof variant === "string" && variant in variantClasses
      ? variantClasses[variant]
      : variantClasses.default;

  return (
    <Comp
      className={cn(
        baseClasses,
        v,
        sizeClasses[size] ?? sizeClasses.default,
        className
      )}
      {...props}
    />
  );
}

export { Button };
