import { clearLocalAuthSnapshot } from './authSession';
import { apiHeaders } from './apiClient';

/** Cookie session only; merge optional Content-Type etc. */
export const getBearerHeaders = apiHeaders;

export function clearStoredSessionAndNotify() {
  void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
    clearLocalAuthSnapshot();
  });
}
