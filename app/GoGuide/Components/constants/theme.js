import { useContext, useSyncExternalStore } from "react";
import { useColorScheme } from "react-native";
import { CreateTripContext } from "../../context/CreateTripContext";


// Centralized theme tokens for colors, spacing, radius, and typography
// Fixed (non-theme-dependent) palette: status colors, overlays and neutrals used across screens
export const Palette = {
  successDark: "#047857",
  slate100: "#F1F5F9",
  slate600: "#475569",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  brand: "#0A7EA4",
  charcoal: "#282828",
  charcoalDark: "#252525",
  charcoalMid: "#2A2A2A",
  mint: "#A7F3D0",
  mintLight: "#ECFDF5",
  skyPale: "#E0F2FE",
  greenPale: "#DCFCE7",
  white: "#FFFFFF",
  black: "#000000",
  success: "#10B981",
  successLight: "#34D399",
  warning: "#F59E0B",
  warningLight: "#FBBF24",
  danger: "#EF4444",
  dangerLight: "#F87171",
  dangerDark: "#DC2626",
  gold: "#FFD700",
  purple: "#8B5CF6",
  teal: "#2DD4BF",
  sky: "#0EA5E9",
  skyDark: "#0284C7",
  skyLight: "#38BDF8",
  blue: "#3B82F6",
  slate50: "#F8FAFC",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate700: "#334155",
  slate800: "#1E293B",
  slate900: "#0F172A",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  gutter: 16,
};

export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  card: 18,
  pill: 20,
  full: 9999,
};

export const Typography = {
  fontRegular: "Outfit-Regular",
  fontMedium: "Outfit-Medium",
  fontBold: "Outfit-Bold",
  sizeXs: 12,
  sizeSm: 12,
  sizeMd: 14,
  sizeBase: 16,
  sizeLg: 18,
  sizeXl: 20,
  sizeXxl: 24,
};

// Centralized theme colors for light and dark mode with unified primary brand color (#0A7EA4)
export const lightTheme = {
  bg: "#F1F5F9",        // Soft Luxury Slate
  card: "#FFFFFF",      // Pure White floating cards
  text: "#0F172A",      // Deep Rich Slate 900
  subtext: "#64748B",   // Slate 500
  border: "#E2E8F0",    // Crisp, subtle border
  primary: "#0A7EA4",   // Unified Signature Brand Color
  accent: "#0A7EA4",
  header: "#FFFFFF",
  headerText: "#0F172A",
  headerBorder: "#E2E8F0",
  input: "#FFFFFF",
  inputText: "#0F172A",
  icon: "#0A7EA4",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E2E8F0",
  badgeBg: "#F1F5F9",
  isDark: false,
};

export const darkTheme = {
  bg: "#0B0F17",        // Deep Obsidian Space Navy
  card: "#161E2E",      // Sleek Dark Sapphire Card
  text: "#F8FAFC",      // Crisp White
  subtext: "#94A3B8",   // Slate 400
  border: "#243044",    // Subtle Dark Slate border
  primary: "#0A7EA4",   // Unified Signature Brand Color
  accent: "#0A7EA4",
  header: "#0B0F17",
  headerText: "#F8FAFC",
  headerBorder: "#20202F",
  input: "#161E2E",
  inputText: "#F8FAFC",
  icon: "#38BDF8",
  tabBar: "#0E1522",
  tabBarBorder: "#1E293B",
  badgeBg: "#222232",
  isDark: true,
};

/**
 * Hook to get the current theme based on user preferences or native system theme.
 * Usage: const theme = useTheme();
 */
const noopSubscribe = () => () => {};

/**
 * Web pages are pre-rendered in light mode. During hydration React keeps the pre-rendered
 * styles (it does not patch style mismatches), so we report "light" until hydration is done,
 * then the real scheme, which triggers a proper re-render. Native always gets true at once.
 */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useTheme() {
  const context = useContext(CreateTripContext);
  const hydrated = useHydrated();
  const liveScheme = useColorScheme();
  const systemScheme = hydrated ? liveScheme : "light";
  const explicitPref = context?.preferences?.darkMode;
  const isDark = typeof explicitPref === "boolean" ? explicitPref : systemScheme === "dark";
  return isDark ? darkTheme : lightTheme;
}
