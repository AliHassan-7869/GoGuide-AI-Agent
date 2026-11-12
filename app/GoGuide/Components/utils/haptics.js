import { Platform } from "react-native";

/** Light tap feedback. Native only: a safe no-op on web. */
export function tapHaptic(style = "Light") {
  if (Platform.OS === "web") return;
  try {
    const Haptics = require("expo-haptics");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style] ?? Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics are optional
  }
}

/** Selection tick (toggle/check). Native only. */
export function selectHaptic() {
  if (Platform.OS === "web") return;
  try {
    require("expo-haptics").selectionAsync();
  } catch {
    // haptics are optional
  }
}
