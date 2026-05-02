/**
 * Patched fetch for Learn2Hire API:
 * - credentials: 'include' for session cookie
 * - CSRF double-submit header on mutating requests
 * - same-origin /api and optional VITE_API_ORIGIN + /api absolute URLs
 */
const nativeFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch;

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'l2h_csrf';

export function apiBase() {
  if (typeof import.meta === 'undefined') return '';
  const o = import.meta.env?.VITE_API_ORIGIN;
  return o ? String(o).replace(/\/$/, '') : '';
}

function readCsrfFromCookie() {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : '';
}

function shouldPatchUrl(input) {
  const base = apiBase();
  if (typeof input === 'string') {
    if (input.startsWith('/api')) return true;
    if (base && input.startsWith(`${base}/api`)) return true;
    return false;
  }
  if (input instanceof URL) {
    if (input.pathname.startsWith('/api')) return true;
    if (base) {
      try {
        const baseUrl = new URL(base);
        return input.origin === baseUrl.origin && input.pathname.startsWith('/api');
      } catch {
        return false;
      }
    }
    return false;
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    try {
      const u = new URL(input.url);
      if (u.pathname.startsWith('/api')) return true;
      if (base) {
        const baseUrl = new URL(base);
        return u.origin === baseUrl.origin && u.pathname.startsWith('/api');
      }
    } catch {
      return false;
    }
  }
  return false;
}

function getMethod(input, init) {
  if (init?.method) return String(init.method).toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return String(input.method || 'GET').toUpperCase();
  }
  return 'GET';
}

function buildHeaders(input, init) {
  let headers;
  if (init?.headers) {
    headers = new Headers(init.headers);
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    headers = new Headers(input.headers);
  } else {
    headers = new Headers();
  }

  const method = getMethod(input, init);
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = readCsrfFromCookie();
    if (csrf && !headers.has(CSRF_HEADER)) {
      headers.set(CSRF_HEADER, csrf);
    }
  }

  return headers;
}

/** Fetch CSRF cookie before any mutating /api calls (run once at app startup). */
export async function bootstrapCsrf() {
  if (typeof window === 'undefined') return;
  const base = apiBase();
  const url = `${base}/api/auth/csrf-token`;
  await nativeFetch(url, { credentials: 'include' });
}

export function installApiFetch() {
  if (typeof window === 'undefined' || window.__learn2hireFetchPatched) return;
  window.__learn2hireFetchPatched = true;

  window.fetch = function patchedFetch(input, init) {
    if (!shouldPatchUrl(input)) {
      return nativeFetch(input, init);
    }

    const headers = buildHeaders(input, init);
    const merged = {
      ...init,
      credentials: 'include',
      headers,
    };

    return nativeFetch(input, merged);
  };
}
