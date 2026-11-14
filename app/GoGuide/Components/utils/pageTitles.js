// Browser-tab titles per route (web). Pure function so it can be unit-tested.
export const DEFAULT_TITLE = "GoGuide AI — Intelligent Travel Agent & Itinerary Planner";

const TITLES = {
  "/discover": "Discover",
  "/mytrip": "My Trip",
  "/ai-assistant": "AI Copilot",
  "/profile": "Profile",
  "/my-trips": "My Trips",
  "/my-bookings": "My Bookings",
  "/favourites": "Favourites",
  "/preferences": "Preferences",
  "/edit-profile": "Account & Security",
  "/safety-alerts": "Safety Alerts",
  "/packing-checklist": "Packing Checklist",
  "/help-center": "Help & Support",
  "/privacy-policy": "Privacy Policy",
  "/terms-of-service": "Terms of Service",
  "/explore": "Explore Destinations",
  "/location": "Live Weather",
  "/trip": "Trip Itinerary",
  "/auth/sign-in": "Sign In",
  "/auth/sign-up": "Create Account",
};

export function titleForPath(pathname) {
  const path = String(pathname || "/").replace(/\/index$/, "").replace(/\/+$/, "") || "/";
  if (path === "/") return DEFAULT_TITLE;
  if (path.startsWith("/create-trip")) return "Plan Your Trip | GoGuide AI";
  const t = TITLES[path];
  return t ? `${t} | GoGuide AI` : DEFAULT_TITLE;
}
