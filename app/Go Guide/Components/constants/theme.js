import { useContext } from "react";
import { CreateTripContext } from "../../context/CreateTripContext";
import { Colors } from "./constants";

// Centralized theme colors for light and dark mode
export const lightTheme = {
  bg: "#F9FAF9",
  card: "#FFFFFF",
  text: "#333333",
  subtext: "#888888",
  border: "#F2F2F2",
  header: "#FFFFFF",
  headerText: undefined, // uses Colors.PRIMARY
  input: "#F2F2F2",
  inputText: "#333333",
  icon: undefined,       // uses Colors.PRIMARY
  tabBar: "#FFFFFF",
  tabBarBorder: "#E0E0E0",
  isDark: false,
};

export const darkTheme = {
  bg: "#121212",
  card: "#1E1E1E",
  text: "#F0F0F0",
  subtext: "#AAAAAA",
  border: "#2C2C2C",
  header: "#1A1A1A",
  headerText: "#F0F0F0",
  input: "#2C2C2C",
  inputText: "#F0F0F0",
  icon: "#F0F0F0",
  tabBar: "#1A1A1A",
  tabBarBorder: "#2C2C2C",
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
