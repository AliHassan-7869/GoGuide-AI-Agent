// Explorer tiers and progress towards the next one. Pure module (unit-tested); the profile page draws it.

export const TIERS = [
  { level: "Tier 1", title: "Novice Explorer", minTrips: 0 },
  { level: "Tier 2", title: "Voyager Pro", minTrips: 1 },
  { level: "Tier 3", title: "Elite Globetrotter", minTrips: 5 },
];

export function getTierInfo(tripCount) {
  const trips = Number.isFinite(Number(tripCount)) && Number(tripCount) > 0 ? Math.floor(Number(tripCount)) : 0;
  let index = 0;
  TIERS.forEach((t, i) => {
    if (trips >= t.minTrips) index = i;
  });
  const current = TIERS[index];
  const next = TIERS[index + 1] || null;
  const remaining = next ? Math.max(0, next.minTrips - trips) : 0;
  const progress = next ? Math.min(1, Math.max(0, (trips - current.minTrips) / (next.minTrips - current.minTrips))) : 1;
  return { index, title: current.title, level: current.level, next, remaining, progress };
}

export function tierCaption(info) {
  if (!info.next) return "You've reached the top tier";
  return `${info.remaining} more trip${info.remaining === 1 ? "" : "s"} to ${info.next.title}`;
}
