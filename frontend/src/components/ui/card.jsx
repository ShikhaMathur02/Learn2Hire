import { cn } from "../../lib/utils";

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/60 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.05)]",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return <div className={cn("p-8", className)} {...props} />;
}

export { Card, CardContent };
