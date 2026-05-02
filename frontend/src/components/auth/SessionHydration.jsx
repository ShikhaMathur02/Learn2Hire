import { useEffect } from "react";

import { readApiResponse } from "../../lib/api";
import { notifyAuthChange } from "../../lib/authSession";

/**
 * Syncs local `user` snapshot with the httpOnly cookie session via GET /api/auth/me.
 */
export function SessionHydration() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await readApiResponse(res);
        if (cancelled) return;
        if (res.ok && data?.success && data.data?.user) {
          localStorage.setItem("user", JSON.stringify(data.data.user));
          notifyAuthChange();
          return;
        }
        if (localStorage.getItem("user")) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          notifyAuthChange();
        }
      } catch {
        /* offline or parse error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
