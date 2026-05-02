import { Facebook, Instagram, Twitter } from "lucide-react";

export const SITE_CONTACT_EMAIL = "learn2hire.solution@gmail.com";
/** Spaces for display; use {@link SITE_PHONE_TEL} for `tel:` links. */
export const SITE_PHONE_DISPLAY = "+91 6398334123";
/** E.164-style value for tel: hyperlinks */
export const SITE_PHONE_TEL = "+916398334123";
export const SITE_ADDRESS_LINES = ["Remote-first", "Serving India · Campus & employer partnerships"];
export const SOCIAL_HANDLE = "autistic_kumar_13";

export const SITE_SOCIAL_LINKS = [
  {
    key: "instagram",
    label: "Instagram",
    href: `https://www.instagram.com/${SOCIAL_HANDLE}/`,
    Icon: Instagram,
  },
  {
    key: "facebook",
    label: "Facebook",
    href: `https://www.facebook.com/${SOCIAL_HANDLE}`,
    Icon: Facebook,
  },
  {
    key: "twitter",
    label: "X (Twitter)",
    href: `https://x.com/${SOCIAL_HANDLE}`,
    Icon: Twitter,
  },
];

/**
 * Mailto helper for inquiry links across marketing and auth footers.
 * @param {string} [subject]
 * @param {string} [body]
 */
export function mailtoLearn2hire(subject = "", body = "") {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${SITE_CONTACT_EMAIL}${qs ? `?${qs}` : ""}`;
}
