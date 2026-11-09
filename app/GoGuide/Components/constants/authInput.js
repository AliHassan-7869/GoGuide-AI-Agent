import { Platform } from "react-native";

/**
 * Explicit, theme-independent colours for auth text fields. The card behind them is
 * always white, so system dark mode / Android WebView force-dark / autofill must
 * never be allowed to flip the typed text to white.
 */
export const AUTH_INPUT_COLOR = "#111827";

/** Merge into the `input` style of every auth TextInput. */
export const authInputTextStyle = {
  color: AUTH_INPUT_COLOR,
  backgroundColor: "#FFFFFF",
  ...Platform.select({
    web: { WebkitTextFillColor: AUTH_INPUT_COLOR, caretColor: AUTH_INPUT_COLOR, colorScheme: "light" },
    default: {},
  }),
};

/** Spread onto every auth <TextInput />. */
export const AUTH_INPUT_PROPS = {
  placeholderTextColor: "#6B7280",
  cursorColor: AUTH_INPUT_COLOR,
  selectionColor: "rgba(124, 58, 237, 0.35)",
  underlineColorAndroid: "transparent",
};
