import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 390;

/** Responsive helpers driven by the live window size (handles all Android DPIs). */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.85), 1.25);
  return {
    width,
    height,
    isSmall: width < 360,
    isTablet: width >= 600,
    scale,
    /** scale a dp value relative to a 390dp design width */
    s: (n) => Math.round(n * scale),
    /** percentage of window width, optionally clamped */
    wp: (pct, max = Infinity) => Math.min((width * pct) / 100, max),
    hp: (pct) => (height * pct) / 100,
  };
}

export default useResponsive;
