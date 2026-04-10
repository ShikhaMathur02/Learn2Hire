import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "../../lib/utils";

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold no-underline transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";

const variantClasses = {
  default:
    "bg-indigo-600 !text-white shadow-sm hover:bg-indigo-700 hover:!text-white",
  outline:
    "border-2 border-indigo-600 bg-white !text-indigo-700 shadow-sm hover:bg-indigo-600 hover:!text-white",
  secondary:
    "border border-white/25 bg-white/15 !text-white hover:bg-white/25 hover:!text-white",
};

const sizeClasses = {
  default: "h-11 px-5 py-2",
  lg: "h-12 px-6 py-3 text-base",
};

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        baseClasses,
        variantClasses[variant] || variantClasses.default,
        sizeClasses[size] || sizeClasses.default,
        className
      )}
      {...props}
    />
  );
}

export { Button };
