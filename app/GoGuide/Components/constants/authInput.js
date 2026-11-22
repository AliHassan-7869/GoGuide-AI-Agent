import { Platform } from "react-native";

import { Palette } from "./theme";
/**
 * Explicit, theme-independent colours for auth text fields. The card behind them is
 * always white, so system dark mode / Android WebView force-dark / autofill must
 * never be allowed to flip the typed text to white.
 */
export const AUTH_INPUT_COLOR = "#111827";

export function getAuthInputStyle(theme) {
  const textColor = theme?.inputText || AUTH_INPUT_COLOR;
  const bgColor = theme?.input || Palette.white;
  const borderColor = theme?.border || Palette.gray200;
  return {
    color: textColor,
    backgroundColor: bgColor,
    borderColor,
    ...Platform.select({
      web: {
        WebkitTextFillColor: textColor,
        caretColor: textColor,
        colorScheme: theme?.isDark ? "dark" : "light",
      },
      default: {},
    }),
  };
}

export function getAuthInputProps(theme) {
  const textColor = theme?.inputText || AUTH_INPUT_COLOR;
  return {
    placeholderTextColor: theme?.subtext || Palette.slate500,
    cursorColor: textColor,
    selectionColor: "rgba(10, 126, 164, 0.30)",
    underlineColorAndroid: "transparent",
  };
}

/** Merge into the `input` style of every auth TextInput. */
export const authInputTextStyle = getAuthInputStyle(null);

/** Spread onto every auth <TextInput />. */
export const AUTH_INPUT_PROPS = {
  placeholderTextColor: "#6B7280",
  cursorColor: AUTH_INPUT_COLOR,
  selectionColor: "rgba(124, 58, 237, 0.35)",
  underlineColorAndroid: "transparent",
};
