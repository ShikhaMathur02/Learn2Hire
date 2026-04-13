import { useLayoutEffect } from "react";

import { clearAuthSession } from "../../lib/authSession";

/**
 * Clears token/user on first mount so marketing and sign-in surfaces are always anonymous.
 * Navigating here ends the previous session (same browser).
 * useLayoutEffect runs before paint to avoid a flash of logged-in chrome.
 */
export function ClearSessionOnMount() {
  useLayoutEffect(() => {
    clearAuthSession();
  }, []);
  return null;
}
