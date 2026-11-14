// End-to-end smoke test for the web build. Run against any deployment:
//   BASE_URL=https://your-site.vercel.app npm run test:e2e
// or locally:  npx expo export -p web && npx serve dist -l 5055 &  npm run test:e2e
// Uses the installed Chrome (set CHROME_PATH if it lives elsewhere). Needs no login and spends no AI quota
// (it plans a curated city, which is built into the app).
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL || "http://localhost:5055").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const results = [];
const step = async (name, fn) => {
  try {
    await fn();
    results.push([true, name]);
  } catch (e) {
    results.push([false, `${name}: ${String(e.message || e).split("\n")[0].slice(0, 160)}`]);
  }
};
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const pageErrors = [];
// The known tab-navigator hydration warning is ignored on purpose (see the workflow manual).
page.on("pageerror", (e) => { if (!String(e).includes("#418")) pageErrors.push(String(e).slice(0, 140)); });
const bodyText = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
const planCity = async (city) => {
  await page.getByPlaceholder(/5 days in Istanbul/i).fill(`3 days in ${city}`);
  await page.getByText("Plan", { exact: true }).first().click();
  await page.waitForURL(/mytrip/, { timeout: 20000 });
  await page.getByText("Day 1").first().waitFor({ timeout: 20000 });
};

await step("home page loads with the app title", async () => {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  expect(/GoGuide/i.test(await page.title()), "title missing GoGuide");
});

await step("every main page opens and has its own title", async () => {
  for (const [path, title] of [["/discover", "Discover"], ["/profile", "Profile"], ["/help-center", "Help"], ["/auth/sign-in", "Sign In"]]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    expect((await page.title()).includes(title), `${path} title is "${await page.title()}"`);
  }
});

await step("guest profile shows a sign-in prompt, not a fake identity", async () => {
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const t = await bodyText();
  expect(t.includes("Sign in to save your trips"), "sign-in prompt missing");
  expect(!t.includes("user@example.com"), "placeholder email is back");
  expect(!/Sign Out/.test(t), "guest sees Sign Out");
});

await step("plan a curated trip: itinerary appears with 'Verified on map' tags", async () => {
  await page.goto(`${BASE}/discover`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await planCity("Istanbul");
  expect(((await bodyText()).match(/Verified on map/g) || []).length >= 1, "no verified tags");
});

await step("after a reload the plan can be resumed from the My Trip hub", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("Continue your plan").first().waitFor({ timeout: 15000 });
  expect(/Istanbul/i.test(await bodyText()), "resume card does not name Istanbul");
  await page.getByText("Continue your plan").first().click();
  await page.getByText("Day 1").first().waitFor({ timeout: 15000 });
});

await step("OFFLINE: with no network, a curated city can still be planned and viewed", async () => {
  await page.goto(`${BASE}/discover`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  // The website loads each screen's code on demand (there is no service worker yet), so visit the
  // screens we will use while still online. A native app bundles everything and needs no warm-up.
  for (const tab of ["My Trip", "Profile", "Discover"]) {
    await page.getByText(tab, { exact: true }).last().click();
    await page.waitForTimeout(1500);
  }
  await ctx.setOffline(true);
  try {
    await planCity("Paris");
    expect(/Paris/i.test(await bodyText()), "Paris plan missing while offline");
    await page.getByText("Profile", { exact: true }).last().click();
    await page.waitForTimeout(1200);
    await page.getByText("My Trip", { exact: true }).last().click();
    await page.waitForTimeout(1200);
    expect(/Paris/i.test(await bodyText()), "trip disappeared after switching tabs offline");
  } finally {
    await ctx.setOffline(false);
  }
});

await step("no unexpected page errors during the run", async () => {
  expect(pageErrors.length === 0, pageErrors.join(" | "));
});

await browser.close();
const failed = results.filter(([ok]) => !ok);
for (const [ok, name] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
console.log(`\n${results.length - failed.length}/${results.length} passed against ${BASE}`);
process.exit(failed.length ? 1 : 0);
