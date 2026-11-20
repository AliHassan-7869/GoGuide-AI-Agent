import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Regression guard: placeholder data that used to be shown to users as if it were real.
// If one of these comes back, this test names the file.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SKIP = new Set(["node_modules", "dist", ".expo", "__tests__", "__screen_tests__", "e2e"]);

async function sources(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await sources(full)));
    else if (/\.(jsx?|ts)$/.test(e.name)) out.push(full);
  }
  return out;
}

const FORBIDDEN = [
  [/Math\.random\(\)\s*\*\s*90000/, "random booking reference numbers"],
  [/Grand Boutique Hotel|Boutique Hotel Stay|Grand \$\{[^}]*\} Suites/, "invented hotel names"],
  [/\$120\/night|\$110\/night|"\$680\.00"/, "invented hotel/flight prices", ["BookingService.js", "PdfDownloadService.js"]],
  [/Live Rate/, "static exchange rates labelled as live"],
  [/0318-8444029/, "a personal phone number shown as 'Traveller Assistance'"],
  [/DEMO_TRIP/, "a demo trip shown for unknown trip links"],
  [/DEFAULT_LIVE_ROUTE_DAYS/, "a demo Dubai route"],
  [/buildOfflinePlan/, "a templated plan presented as generated"],
  [/\|\|\s*"4\.[0-9]"/, "a made-up default rating"],
  [/"Verified Stay"|"Competitive Rate"/, "placeholder hotel claims"],
  [/Heritage Museum & Arts|Traditional Regional Bistro/, "an invented fallback itinerary"],
];

test("no fabricated placeholder data in the app sources", async () => {
  const files = await sources(ROOT);
  assert.ok(files.length > 50, "found the sources");
  const hits = [];
  for (const f of files) {
    const text = await readFile(f, "utf8");
    for (const [re, why, onlyIn] of FORBIDDEN) {
      if (onlyIn && !onlyIn.includes(path.basename(f))) continue;
      if (re.test(text)) hits.push(`${path.relative(ROOT, f)}: ${why}`);
    }
  }
  assert.deepEqual(hits, []);
});

test("the safety screen no longer hard-codes 911", async () => {
  const text = await readFile(path.join(ROOT, "app/safety-alerts.jsx"), "utf8");
  assert.equal(/number:\s*"911"/.test(text), false);
});
