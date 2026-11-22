import { Linking, Platform } from "react-native";

const SAFE_WEB_PROTOCOLS = new Set(["https:", "http:"]);
const EXTRA_CONTACT_PROTOCOLS = new Set(["tel:", "mailto:"]);

/** Validates that a URL uses an allowed scheme before passing it to the browser or OS handler. */
export function isSafeExternalUrl(url, { allowContact = false } = {}) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (SAFE_WEB_PROTOCOLS.has(parsed.protocol)) return true;
    if (allowContact && EXTRA_CONTACT_PROTOCOLS.has(parsed.protocol)) return true;
    return false;
  } catch {
    return false;
  }
}

/** Opens a validated URL in a new tab on web, or via the OS handler on native. Never throws. */
export async function openExternalUrl(url, options = {}) {
  if (!isSafeExternalUrl(url, options)) {
    console.warn("[openExternalUrl] blocked unsafe or invalid URL");
    return false;
  }
  const safeUrl = String(url).trim();
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(safeUrl, "_blank", "noopener,noreferrer");
      return true;
    }
    await Linking.openURL(safeUrl);
    return true;
  } catch (e) {
    console.warn("[openExternalUrl] failed:", e?.message || e);
    return false;
  }
}
