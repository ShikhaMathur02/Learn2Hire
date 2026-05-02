import { useSyncExternalStore } from 'react';

let cachedSnapshot = null;

function computeSnapshot() {
  if (typeof window === 'undefined') {
    return {
      user: null,
      isAuthenticated: false,
      role: null,
      isStudent: false,
      learningPath: '/learning#learning-explore-catalog',
    };
  }
  const storedUser = localStorage.getItem('user');
  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }
  /** Session is validated against httpOnly cookie via SessionHydration + API; we keep a user snapshot only. */
  const isAuthenticated = Boolean(user);
  const role = user?.role ? String(user.role).toLowerCase() : null;
  const isStudent = isAuthenticated && role === 'student';
  const learningPath = isStudent
    ? '/dashboard/learning#learning-explore-catalog'
    : '/learning#learning-explore-catalog';
  return { user, isAuthenticated, role, isStudent, learningPath };
}

function getSnapshot() {
  const next = computeSnapshot();
  const key = storedUserKey(next.user);
  if (cachedSnapshot && cachedSnapshot.key === key) {
    return cachedSnapshot.snapshot;
  }
  cachedSnapshot = { key, snapshot: next };
  return next;
}

function storedUserKey(user) {
  if (!user) return '';
  try {
    return JSON.stringify(user);
  } catch {
    return String(user?.id ?? user?.email ?? '');
  }
}

/** Stable snapshot for SSR / hydration; client then re-reads via getSnapshot. */
function getServerSnapshot() {
  if (typeof window === 'undefined') {
    return {
      user: null,
      isAuthenticated: false,
      role: null,
      isStudent: false,
      learningPath: '/learning#learning-explore-catalog',
    };
  }
  return computeSnapshot();
}

function subscribe(onStoreChange) {
  const handler = () => {
    cachedSnapshot = null;
    onStoreChange();
  };
  window.addEventListener('learn2hire-auth-change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('learn2hire-auth-change', handler);
    window.removeEventListener('storage', handler);
  };
}

/** Keeps UI (e.g. SiteHeader) in sync with login, signup, logout, and other tabs. */
export function useAuthSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function notifyAuthChange() {
  cachedSnapshot = null;
  window.dispatchEvent(new Event('learn2hire-auth-change'));
}

/** Remove user snapshot from localStorage only (instant); use before async cookie logout. */
export function clearLocalAuthSnapshot() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  notifyAuthChange();
}

/** Clear httpOnly cookie + local snapshot; notify listeners. */
export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
    clearLocalAuthSnapshot();
  });
}
