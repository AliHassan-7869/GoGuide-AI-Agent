import { useContext } from "react";
import { CreateTripContext } from "../../context/CreateTripContext";
import { Colors } from "./constants";

// Centralized theme colors for light and dark mode with unified primary brand color
export const lightTheme = {
  bg: "#F1F5F9",        // Soft Luxury Slate
  card: "#FFFFFF",      // Pure White floating cards
  text: "#0F172A",      // Deep Rich Slate 900
  subtext: "#64748B",   // Slate 500
  border: "#E2E8F0",    // Crisp, subtle border
  primary: "#0A7EA4",   // Unified Signature Brand Color
  header: "#FFFFFF",
  headerText: "#0F172A",
  input: "#FFFFFF",
  inputText: "#0F172A",
  icon: "#0A7EA4",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E2E8F0",
  isDark: false,
};

export const darkTheme = {
  bg: "#0B0F17",        // Deep Obsidian Space Navy
  card: "#161E2E",      // Sleek Dark Sapphire Card
  text: "#F8FAFC",      // Crisp White
  subtext: "#94A3B8",   // Slate 400
  border: "#243044",    // Subtle Dark Slate border
  primary: "#0A7EA4",   // Unified Signature Brand Color
  header: "#0B0F17",
  headerText: "#F8FAFC",
  input: "#161E2E",
  inputText: "#F8FAFC",
  icon: "#38BDF8",
  tabBar: "#0E1522",
  tabBarBorder: "#1E293B",
  isDark: true,
};

/**
 * Hook to get the current theme based on user preferences.
 * Usage: const theme = useTheme();
 */
export function useTheme() {
  const context = useContext(CreateTripContext);
  const isDark = context?.preferences?.darkMode ?? false;
  return isDark ? darkTheme : lightTheme;
}
