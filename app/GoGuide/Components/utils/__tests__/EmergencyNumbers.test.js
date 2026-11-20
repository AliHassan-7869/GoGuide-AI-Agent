import test from "node:test";
import assert from "node:assert/strict";
import { countryKeyFor, buildEmergencyContacts, INTERNATIONAL_NUMBER } from "../emergencyNumbers.js";

const numbers = (dest) => buildEmergencyContacts(dest).contacts.map((c) => c.number);

test("finds the country from 'City, Country' and from well-known city names", () => {
  assert.equal(countryKeyFor("Lahore, Pakistan"), "pakistan");
  assert.equal(countryKeyFor("Dubai, United Arab Emirates"), "uae");
  assert.equal(countryKeyFor("Dubai"), "uae");
  assert.equal(countryKeyFor("Kyoto, Japan"), "japan");
  assert.equal(countryKeyFor("Istanbul, Turkey"), "turkey");
  assert.equal(countryKeyFor("Istanbul, Türkiye"), "turkey");
  assert.equal(countryKeyFor("New York, NY, USA"), "usa");
  assert.equal(countryKeyFor("London, England, United Kingdom"), "uk");
  assert.equal(countryKeyFor("Atlantis"), null);
  assert.equal(countryKeyFor(""), null);
  assert.equal(countryKeyFor(undefined), null);
});

test("numbers are the destination's own, never 911 everywhere", () => {
  assert.deepEqual(numbers("Lahore, Pakistan"), ["15", "1122", "16"]);
  assert.deepEqual(numbers("Tokyo, Japan"), ["110", "119"]);
  assert.deepEqual(numbers("Dubai, United Arab Emirates"), ["999", "998", "997"]);
  assert.deepEqual(numbers("Paris, France"), ["17", "15", "18"]);
  assert.deepEqual(numbers("Istanbul, Turkey"), ["112"]);
  assert.deepEqual(numbers("Rome, Italy"), ["112"]);
  assert.deepEqual(numbers("London, UK"), ["999"]);
  assert.deepEqual(numbers("Miami, United States"), ["911"]);
  assert.equal(numbers("Lahore, Pakistan").includes("911"), false);
});

test("unknown destinations get the international number and a plain 'confirm locally' note, not a guess", () => {
  const r = buildEmergencyContacts("Somewhere, Nowhere");
  assert.equal(r.known, false);
  assert.deepEqual(r.contacts.map((c) => c.number), [INTERNATIONAL_NUMBER]);
  assert.match(r.note, /confirm/i);
  assert.equal(buildEmergencyContacts(undefined).known, false);
});

test("no personal phone numbers and every number is a short dialable code", () => {
  const all = ["Pakistan", "Japan", "UAE", "France", "Turkey", "Italy", "Spain", "Thailand", "India", "Australia", "Germany", "USA", "UK"]
    .flatMap((c) => numbers(c));
  for (const n of all) assert.match(n, /^\d{2,4}$/, n);
});

test("services with the same number are shown once", () => {
  const japan = buildEmergencyContacts("Tokyo, Japan").contacts;
  assert.equal(japan.length, 2);
  assert.match(japan[1].title, /Ambulance/);
  assert.match(japan[1].title, /Fire/);
});
