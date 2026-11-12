import { Redirect } from "expo-router";

/**
 * Travellers used to be its own wizard step. It is now part of "Travellers & Budget"
 * (select-budget), so the wizard has 5 steps. This route is kept so old links and
 * bookmarks still work; it simply forwards to the merged screen.
 */
export default function SelectTraveler() {
  return <Redirect href="/create-trip/select-budget" />;
}
