import { Linking, Platform } from "react-native";

// The only sites the app sends people to (each also covers its subdomains).
const TRUSTED_HOSTS = ["booking.com", "google.com", "skyscanner.com"];
const EXTRA_CONTACT_PROTOCOLS = new Set(["tel:", "mailto:"]);

/** Allows https links to trusted sites (and tel/mailto when asked) before passing them to the browser or OS. */
export function isSafeExternalUrl(url, { allowContact = false } = {}) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") {
      // "https://google.com@evil.example" style credentials are never legitimate here.
      if (parsed.username || parsed.password) return false;
      const host = parsed.hostname.toLowerCase();
      return TRUSTED_HOSTS.some((trusted) => host === trusted || host.endsWith(`.${trusted}`));
    }
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
