// constants/constants.ts

const tintColorLight = "#0a7ea4";
const tintColorDark = "#ffffff";

export const Colors = {
  // Basic
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  PRIMARY: "#0a7ea4", // main accent
  SECONDARY: "#f2994a",
  GRAY: "#7d7d7d",
  LIGHT_GRAY: "#E5E5E5",
  DARK_GRAY: "#4B4B4B",

  // Semantic / status colors
  SUCCESS: "#27AE60",
  ERROR: "#EB5757",
  WARNING: "#F2C94C",
  INFO: "#2F80ED",

  // Backgrounds & surfaces
  BACKGROUND_LIGHT: "#F9F9F9",
  BACKGROUND_DARK: "#121212",
  CARD_LIGHT: "#FFFFFF",
  CARD_DARK: "#1E1E1E",

  // Text
  TEXT_LIGHT: "#11181C",
  TEXT_DARK: "#ECEDEE",
  TEXT_GRAY: "#7D7D7D",
  TEXT_MUTED: "#9BA1A6",

  // Buttons / accents
  BUTTON_PRIMARY: "#0a7ea4",
  BUTTON_SECONDARY: "#F2994A",
  BUTTON_DISABLED: "#CCCCCC",

  // Tint / icons
  Light: {
    text: "#11181c",
    background: "#FFFFFF",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    border: "#E0E0E0",
    placeholder: "#B0B0B0",
    shadow: "rgba(0,0,0,0.08)",
  },

  Dark: {
    text: "#ECEDEE",
    background: "#000000",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    border: "#2C2C2C",
    placeholder: "#5A5A5A",
    shadow: "rgba(0,0,0,0.5)",
  },

  // Gradients (optional)
  Gradient: {
    PRIMARY: ["#0a7ea4", "#0d9ec6"],
    SECONDARY: ["#F2994A", "#F2C94C"],
    SUCCESS: ["#27AE60", "#6FCF97"],
    ERROR: ["#EB5757", "#FF7B7B"],
  },
} as const;
