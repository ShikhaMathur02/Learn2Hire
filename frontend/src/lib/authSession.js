import { useSyncExternalStore } from 'react';

let cachedSnapshot = null;

function computeSnapshot() {
  if (typeof window === 'undefined') {
    return {
      token: null,
      user: null,
      isAuthenticated: false,
      role: null,
      isStudent: false,
      learningPath: '/learning#learning-explore-content',
    };
  }
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }
  const isAuthenticated = Boolean(token && user);
  const role = user?.role ? String(user.role).toLowerCase() : null;
  const isStudent = isAuthenticated && role === 'student';
  const learningPath = isStudent
    ? '/dashboard/learning#learning-explore-content'
    : '/learning#learning-explore-content';
  return { token, user, isAuthenticated, role, isStudent, learningPath };
}

function getSnapshot() {
  const next = computeSnapshot();
  const key = `${next.token ?? ''}|${storedUserKey(next.user)}`;
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
      token: null,
      user: null,
      isAuthenticated: false,
      role: null,
      isStudent: false,
      learningPath: '/learning#learning-explore-content',
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

/** Clear session and notify listeners so headers and routes stay consistent. */
export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    notifyAuthChange();
  }
}
