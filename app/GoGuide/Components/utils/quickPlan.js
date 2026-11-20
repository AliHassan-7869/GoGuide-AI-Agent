// Trip fields for the one-tap "quick plan" entry points (Generate 3-Day Plan, recommended destinations).
// The wizard's single source of truth is startDate + endDate + totalNoOfDays (select-dates.jsx), and the
// review/generate screens read exactly those. Pure module (unit-tested).

const DEFAULT_DAYS = 3;
const MAX_DAYS = 30;

const startOfTomorrow = (now) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

export function quickPlanFields({ days = DEFAULT_DAYS, budget = "Moderate", now = new Date() } = {}) {
  const n = parseInt(days, 10);
  const totalNoOfDays = Number.isFinite(n) && n >= 1 ? Math.min(MAX_DAYS, n) : DEFAULT_DAYS;
  const startDate = startOfTomorrow(now);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + totalNoOfDays - 1);
  return {
    startDate,
    endDate,
    totalNoOfDays,
    budget,
    traveler: { title: "Solo / Couple", people: "1 to 2" },
    interests: ["Sightseeing", "Local Food", "Culture"],
    // Left over from an earlier wizard run, these would override the quick plan's interests.
    interestsDetails: [],
    selectedCategories: [],
  };
}
