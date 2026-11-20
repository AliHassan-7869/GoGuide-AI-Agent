import * as Clipboard from "expo-clipboard";

/**
 * Copies text to the clipboard on iOS, Android and web.
 * Resolves true only if the text really was copied. Callers must show "Copied" only on true, and
 * otherwise show the text so the user can copy it by hand. Never throws.
 */
export async function copyText(text) {
  const value = text === null || text === undefined ? "" : String(text);
  if (!value) return false;
  try {
    await Clipboard.setStringAsync(value);
    return true;
  } catch {
    // fall through to the browser API (some web contexts only allow that one)
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // not allowed (permissions / insecure context)
  }
  return false;
}
