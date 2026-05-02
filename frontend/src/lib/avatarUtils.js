/** Max size for profile photo uploads (must match backend multer limit). */
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Turn a stored path like `/uploads/avatars/...` into a full URL when the app
 * is deployed with the API on another origin (`VITE_API_ORIGIN`).
 */
export function publicUploadUrl(path) {
  if (path == null) return "";
  const p = String(path).trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const origin = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_ORIGIN : "";
  if (origin && p.startsWith("/")) {
    return `${String(origin).replace(/\/$/, "")}${p}`;
  }
  return p;
}

/** Two-letter initials from full name (first + last word). */
export function nameToInitials(name) {
  const t = String(name || "").trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] || "";
  const last = parts[parts.length - 1][0] || "";
  const s = `${first}${last}`.toUpperCase();
  return s || "?";
}

export function persistUserProfilePhotoInLocalStorage(profilePhoto) {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const u = JSON.parse(raw);
    u.profilePhoto = profilePhoto || "";
    localStorage.setItem("user", JSON.stringify(u));
  } catch {
    /* ignore */
  }
}
