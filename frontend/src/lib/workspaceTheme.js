import { cn } from "./utils";

/** Roles that have a dedicated tinted gradient canvas in `index.css`. */
export const THEMED_WORKSPACE_ROLES = new Set(["student", "faculty", "company", "college", "admin"]);

/**
 * Props for full-page wrappers so CSS variables `--bg-card`, `--workspace-gradients`, etc. apply.
 *
 * @param {string | null | undefined} role — `user.role` or similar (case-insensitive).
 * @param {string} [extraClassName] — merged with Tailwind `cn`.
 * @returns {{ className: string } & ({ 'data-l2h-workspace': string } | Record<string, never>)}
 */
export function workspaceRootProps(role, extraClassName) {
  const r = role ? String(role).toLowerCase() : "";
  const scoped = THEMED_WORKSPACE_ROLES.has(r) ? r : null;
  const className = cn(
    "min-h-screen text-[var(--text)]",
    scoped ? "l2h-workspace-canvas" : "bg-[var(--bg-app)]",
    extraClassName
  );
  if (!scoped) {
    return { className };
  }
  return { "data-l2h-workspace": scoped, className };
}
