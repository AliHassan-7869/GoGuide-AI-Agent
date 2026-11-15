// Layout guard: opens every screen at narrow phone widths (320px, and 280px = a 360px phone with large
// system text) using deliberately LONG names, and fails if any text sticks out of the screen or is cut off
// by its card. This is the class of bug that pushed flight times and boarding-pass text off Android screens.
//   BASE_URL=https://your-site.vercel.app npm run test:overflow
// Run `npx expo export -p web && npx serve dist -l 5055` first for a local check. Spends no AI quota.
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL || "http://localhost:5055").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const WIDTHS = [320, 280];

// Runs inside the page: finds text leaves outside the screen, or outside a clipping (overflow:hidden) card.
const auditFn = () => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  const scrollable = (el) => {
    for (let e = el.parentElement; e; e = e.parentElement) {
      const o = getComputedStyle(e).overflowX;
      if ((o === "auto" || o === "scroll") && e.scrollWidth > e.clientWidth + 1) return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length || !el.textContent.trim()) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const text = el.textContent.trim().slice(0, 50);
    if ((r.right > vw + 1 || r.left < -1) && !scrollable(el)) out.push(`outside screen: "${text}" (right ${Math.round(r.right)} > ${vw})`);
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === "hidden" || cs.overflowX === "clip") {
        const ar = a.getBoundingClientRect();
        if (ar.width > 0 && r.right > ar.right + 1 && !scrollable(el)) out.push(`cut off by card: "${text}" (right ${Math.round(r.right)} > ${Math.round(ar.right)})`);
        break;
      }
    }
  }
  return [...new Set(out)];
};

const LONG_TRIP = {
  fromLocation: { name: "Islamabad International Airport, Pakistan" },
  toLocation: { name: "Rio de Janeiro Galeao International, Brazil" },
  traveler: { title: "Family with Young Children" },
  budget: "Luxury", totalNoOfDays: 12, startDate: "2026-12-20T00:00:00.000Z", endDate: "2026-12-31T00:00:00.000Z",
  selectedCategories: ["Historical Landmarks & Museums", "Culinary Hotspots"],
};
const now = new Date().toISOString();
const LONG_BOOKINGS = [
  { id: "bk_1_flight", type: "Flights", status: "Upcoming", bookingRef: "GG-F48213", title: "Pakistan International Airlines (PK-785 / PK-786)", subtitle: "ISB (Islamabad International Airport) ✈️ LHR (London Heathrow Airport)", checkIn: "Outbound: Dec 20, 2026 • 09:15 AM", checkOut: "Return: Dec 31, 2026 • 04:45 PM", details: "Premium Economy Flex • 7h 45m (1 Stop • via Doha, 2h 10m layover) • 30kg Checked + 7kg Cabin", price: "$1,680.00 - $2,240.00", image: "", destination: "London, United Kingdom", createdAt: now },
  { id: "bk_2_hotel", type: "Hotels", status: "Upcoming", bookingRef: "GG-H90412", title: "The Ritz-Carlton Grand Boutique Hotel & Residences", subtitle: "150 Piccadilly, St. James's, London W1J 9BR, United Kingdom", checkIn: "Dec 20, 2026 • 03:00 PM", checkOut: "Dec 31, 2026 • 11:00 AM", details: "Family with Young Children • 1 Deluxe Room • Planned stay (not booked yet)", price: "$420/night", image: "", destination: "London, United Kingdom", createdAt: now },
];

const LONG_FAVORITES = [
  { id: "f1", name: "Rio de Janeiro Galeao International Airport Area, Brazil", title: "Rio de Janeiro Galeao International Airport Area, Brazil", image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800", category: "Hotel • Luxury Beachfront Resort & Spa", rating: "4.9" },
  { id: "f2", name: "Broken Image Place", title: "Broken Image Place", image: "not-a-link", category: "Moderate", rating: 4.2 },
];

const PLAIN_PAGES = ["/discover", "/profile", "/ai-assistant", "/help-center", "/emergency-info", "/feedback", "/preferences", "/edit-profile", "/safety-alerts", "/packing-checklist", "/favourites", "/my-trips", "/explore", "/location", "/auth/sign-in", "/auth/sign-up", "/privacy-policy", "/terms-of-service", "/create-trip/search-place", "/create-trip/select-dates", "/create-trip/select-budget", "/create-trip/interest-page"];

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const failures = [];
let checked = 0;
const record = (label, w, problems) => {
  checked += 1;
  if (problems.length) failures.push(`${label} @${w}px:\n    - ${problems.slice(0, 5).join("\n    - ")}`);
};
const settle = (p, ms = 2500) => p.waitForTimeout(ms);

for (const w of WIDTHS) {
  const newPage = async (init) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 740 }, isMobile: true, hasTouch: true });
    if (init) await ctx.addInitScript(init.fn, init.arg);
    return { ctx, page: await ctx.newPage() };
  };

  // 1) Boarding pass on the review screen, with long city names
  {
    const { ctx, page } = await newPage({ fn: (t) => localStorage.setItem("tripData:guest", JSON.stringify(t)), arg: LONG_TRIP });
    await page.goto(`${BASE}/create-trip/review-trip`, { waitUntil: "domcontentloaded" }); await settle(page, 3500);
    record("review boarding pass", w, await page.evaluate(auditFn)); await ctx.close();
  }

  // 2) My Bookings list + the pass popup, with long titles
  {
    const { ctx, page } = await newPage({ fn: (l) => localStorage.setItem("@goguide_user_bookings", JSON.stringify(l)), arg: LONG_BOOKINGS });
    await page.goto(`${BASE}/my-bookings`, { waitUntil: "domcontentloaded" }); await settle(page, 3500);
    record("my bookings list", w, await page.evaluate(auditFn));
    await page.getByLabel("Open digital pass").first().click(); await settle(page, 1200);
    record("my bookings pass popup", w, await page.evaluate(auditFn)); await ctx.close();
  }

  // 2b) Favourites with long names and a broken image
  {
    const { ctx, page } = await newPage({ fn: (l) => localStorage.setItem("@goguide_favorites", JSON.stringify(l)), arg: LONG_FAVORITES });
    await page.goto(`${BASE}/favourites`, { waitUntil: "domcontentloaded" }); await settle(page, 3500);
    record("favourites page", w, await page.evaluate(auditFn)); await ctx.close();
  }

  // 3) A planned trip with a long origin: every section of the trip page
  {
    const { ctx, page } = await newPage();
    await page.goto(`${BASE}/discover`, { waitUntil: "domcontentloaded" }); await settle(page);
    await page.getByPlaceholder(/5 days in Istanbul/i).fill("4 days from Islamabad International Airport to Dubai");
    await page.getByText("Plan", { exact: true }).first().click();
    await page.waitForURL(/mytrip/, { timeout: 20000 }); await page.getByText("Day 1").first().waitFor({ timeout: 20000 });
    for (const section of ["Overview", "Schedule", "Stays", "Flights", "Budget"]) {
      await page.getByText(section, { exact: true }).first().click().catch(() => {}); await settle(page, 1200);
      record(`trip page: ${section}`, w, await page.evaluate(auditFn));
    }
    await ctx.close();
  }

  // 4) Every other screen, as a first-time visitor
  for (const path of PLAIN_PAGES) {
    const { ctx, page } = await newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" }).catch(() => {}); await settle(page, 2200);
    record(path, w, await page.evaluate(auditFn)); await ctx.close();
  }
}

await browser.close();
if (failures.length) {
  console.log(`FAIL: ${failures.length} of ${checked} checks found text outside its screen or card\n`);
  failures.forEach((f) => console.log(`  ${f}`));
  process.exit(1);
}
console.log(`PASS: ${checked} checks, no text outside its screen or card (widths ${WIDTHS.join("px, ")}px) against ${BASE}`);
