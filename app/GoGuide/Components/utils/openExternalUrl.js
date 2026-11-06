import { Linking, Platform } from "react-native";

/** Opens a URL in a new tab on web, or via the OS handler on native. Never throws. */
export async function openExternalUrl(url) {
  if (!url) return false;
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch (e) {
    console.warn("[openExternalUrl] failed:", e?.message || e);
    return false;
  }
}
