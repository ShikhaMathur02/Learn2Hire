/** Smooth-scroll to an element by `id` and move focus for accessibility (without scrolling again). */
export function scrollToElementId(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    el.focus({ preventScroll: true });
  } catch {
    /* not focusable */
  }
}
