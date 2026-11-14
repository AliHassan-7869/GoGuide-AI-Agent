// App-side error monitoring. Pure logic (no React / Firebase imports) so it can be unit-tested.
// Reports go to the Firestore "AppErrors" collection (create-only in firestore.rules) via `send`.
// The rules require exactly these fields as short strings, so every report is trimmed to fit.

const MAX_MESSAGE = 1000;
const MAX_STACK = 2000;
const MAX_COMPONENT_STACK = 2000;

// Known harmless noise: not worth a report (and hydration warnings would repeat on every page load).
const IGNORED = [/Minified React error #(418|423|425)\b/i, /ResizeObserver loop/i, /^Script error\.?$/i, /Network request failed/i];

const clip = (v, n) => String(v ?? "").slice(0, n);

export function buildErrorReport(error, { componentStack = "", platform = "unknown", now = () => new Date() } = {}) {
  const message = error && typeof error === "object" && "message" in error ? error.message : error;
  const stack = error && typeof error === "object" && "stack" in error ? error.stack : "";
  return {
    message: clip(message || "Unknown error", MAX_MESSAGE),
    stack: clip(stack, MAX_STACK),
    componentStack: clip(componentStack, MAX_COMPONENT_STACK),
    platform: clip(platform, 40),
    timestamp: now().toISOString(),
  };
}

export function isIgnorable(error) {
  const text = String((error && error.message) || error || "");
  return IGNORED.some((re) => re.test(text));
}

/** Returns report(error, extra) -> boolean. Never throws; caps and de-duplicates reports per session. */
export function createErrorReporter({ send, platform = "unknown", maxPerSession = 5, now } = {}) {
  const seen = new Set();
  let count = 0;
  return function report(error, extra = {}) {
    try {
      if (typeof send !== "function" || count >= maxPerSession || isIgnorable(error)) return false;
      const payload = buildErrorReport(error, { platform, now, ...extra });
      const fingerprint = `${payload.message}|${payload.stack.split("\n")[1] || ""}`;
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      count += 1;
      Promise.resolve(send(payload)).catch(() => {});
      return true;
    } catch {
      return false;
    }
  };
}

/** Hooks uncaught errors and unhandled promise rejections (web) / the global handler (native). */
export function installGlobalErrorHandlers(report, env = globalThis) {
  const installed = [];
  try {
    if (typeof env.addEventListener === "function" && typeof env.document !== "undefined") {
      env.addEventListener("error", (e) => report(e?.error || e?.message || "Window error"));
      env.addEventListener("unhandledrejection", (e) => report(e?.reason || "Unhandled promise rejection"));
      installed.push("web");
    }
    const utils = env.ErrorUtils;
    if (utils && typeof utils.setGlobalHandler === "function" && typeof utils.getGlobalHandler === "function") {
      const previous = utils.getGlobalHandler();
      utils.setGlobalHandler((error, isFatal) => {
        report(error);
        if (typeof previous === "function") previous(error, isFatal);
      });
      installed.push("native");
    }
  } catch {
    /* monitoring must never break the app */
  }
  return installed;
}
