import { useLayoutEffect } from "react";

import { clearLocalAuthSnapshot, notifyAuthChange } from "../../lib/authSession";

/**
 * Clears user snapshot on first mount so marketing and sign-in surfaces look anonymous.
 * Ends the browser session server-side via logout (cookie) without waiting for that request.
 */
export function ClearSessionOnMount() {
  useLayoutEffect(() => {
    clearLocalAuthSnapshot();
    void fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  }, []);
  return null;
}
