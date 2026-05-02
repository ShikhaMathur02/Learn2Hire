import { readApiResponse } from './api';

/**
 * All /api calls use cookie session + CSRF (see installApiFetch). Use this alias so imports stay explicit.
 * @type {typeof fetch}
 */
export const apiFetch = (...args) => fetch(...args);

/** Request headers for cookie-authenticated JSON APIs (no Bearer; optional Content-Type etc.). */
export function apiHeaders(extra = {}) {
  return { ...extra };
}

export async function apiJson(response, htmlFallbackMessage) {
  return readApiResponse(response, htmlFallbackMessage);
}
