// How much of a screen area the on-screen keyboard is covering. Pure module (unit-tested).
//
// Why: on Android 15+ and any edge-to-edge app, the window does NOT shrink when the keyboard opens, so the
// keyboard sits on top of the chat bar. On phones where the window does shrink, nothing is covered. Measuring
// the real overlap handles both cases: we add exactly the space that is covered, no more (no gap), no less.

const MAX_OVERLAP = 700;

/** containerBottom and keyboardTop are both y positions in window coordinates (pixels from the top). */
export function overlapFor(containerBottom, keyboardTop) {
  // Only real numbers count: a missing value (null, undefined, text) means "no keyboard", never 0
  if (typeof containerBottom !== "number" || typeof keyboardTop !== "number") return 0;
  const bottom = containerBottom;
  const top = keyboardTop;
  if (!Number.isFinite(bottom) || !Number.isFinite(top)) return 0;
  return Math.min(MAX_OVERLAP, Math.max(0, Math.round(bottom - top)));
}

/**
 * Mobile web: how much of the page the keyboard covers, from the browser's visual viewport.
 * Chrome (resizes-content) shrinks the page itself so this is 0; iPhone Safari only shrinks the visual
 * viewport, so the bar must be lifted. Pinch-zoom also shrinks the visual viewport, so it is ignored.
 */
export function webOverlap({ innerHeight, height, offsetTop, scale, containerBottom } = {}) {
  for (const v of [innerHeight, height, offsetTop]) if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  if (typeof scale === "number" && Math.abs(scale - 1) > 0.01) return 0;
  const visibleBottom = offsetTop + height;
  // Under 80px lost at the bottom is browser toolbars, not a keyboard
  if (Math.round(innerHeight - visibleBottom) < 80) return 0;
  // Measure from the chat area's own bottom edge when known (a tab bar below it is also under the keyboard),
  // otherwise from the bottom of the page
  const bottom = typeof containerBottom === "number" && Number.isFinite(containerBottom) ? containerBottom : innerHeight;
  return Math.min(MAX_OVERLAP, Math.max(0, Math.round(bottom - visibleBottom)));
}

/** Top edge of the keyboard from a keyboard event, with a fallback when the platform omits screenY. */
export function keyboardTopFromEvent(event, screenHeight) {
  const end = event && event.endCoordinates;
  if (!end) return null;
  if (Number.isFinite(end.screenY) && end.screenY > 0) return end.screenY;
  if (Number.isFinite(end.height) && Number.isFinite(screenHeight)) return screenHeight - end.height;
  return null;
}
