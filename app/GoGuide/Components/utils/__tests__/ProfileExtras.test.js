import test from "node:test";
import assert from "node:assert/strict";
import { getTierInfo, tierCaption, TIERS } from "../explorerTier.js";
import {
  sanitizeEmergencyInfo, validateEmergencyInfo, cleanPhone, telLink, isValidPhone, isEmergencyInfoEmpty, emptyEmergencyInfo, MAX_CONTACTS,
} from "../emergencyInfo.js";
import { buildFeedbackMessage, clampStars, canSubmitFeedback, starLabel } from "../feedback.js";

test("tiers match the thresholds the profile always used (0, 1 and 5 trips)", () => {
  assert.equal(getTierInfo(0).title, "Novice Explorer");
  assert.equal(getTierInfo(1).title, "Voyager Pro");
  assert.equal(getTierInfo(4).title, "Voyager Pro");
  assert.equal(getTierInfo(5).title, "Elite Globetrotter");
  assert.equal(TIERS.length, 3);
});

test("tier progress and caption", () => {
  assert.equal(tierCaption(getTierInfo(0)), "1 more trip to Voyager Pro");
  assert.equal(getTierInfo(0).progress, 0);
  const mid = getTierInfo(3);
  assert.equal(mid.remaining, 2);
  assert.equal(mid.progress, 0.5);
  assert.equal(tierCaption(mid), "2 more trips to Elite Globetrotter");
  assert.equal(tierCaption(getTierInfo(9)), "You've reached the top tier");
  assert.equal(getTierInfo(9).progress, 1);
  for (const bad of [undefined, null, -3, NaN, "abc"]) assert.equal(getTierInfo(bad).title, "Novice Explorer");
});

test("emergency info is cleaned, capped and always has three contact slots", () => {
  const out = sanitizeEmergencyInfo({
    contacts: [{ name: "  Ali   Khan ", phone: "+92 (300) 123-4567 ext!", relation: "Brother" }, null, "junk", { name: "x".repeat(200) }],
    bloodType: "O+", allergies: "Peanuts\r\nPenicillin", notes: "n".repeat(900), insurance: 42,
  });
  assert.equal(out.contacts.length, MAX_CONTACTS);
  assert.equal(out.contacts[0].name, "Ali Khan");
  assert.equal(out.contacts[0].phone, "+92 (300) 123-4567");
  assert.equal(out.contacts[3], undefined);
  assert.equal(out.bloodType, "O+");
  assert.equal(out.allergies, "Peanuts\nPenicillin");
  assert.equal(out.notes.length, 400);
  assert.equal(out.insurance, "42");
  assert.equal(sanitizeEmergencyInfo({ bloodType: "Z+" }).bloodType, "");
  for (const bad of [null, undefined, "x", 5, []]) assert.deepEqual(sanitizeEmergencyInfo(bad), emptyEmergencyInfo());
});

test("phone numbers: cleaning, validation and the call link", () => {
  assert.equal(cleanPhone("  +92 300-123 4567abc "), "+92 300-123 4567");
  assert.equal(isValidPhone("123"), false);
  assert.equal(isValidPhone("+92 300 1234567"), true);
  assert.equal(isValidPhone("1".repeat(20)), false);
  assert.equal(telLink("+92 (300) 123-4567"), "tel:+923001234567");
  assert.equal(telLink("0300 1234567"), "tel:03001234567");
  assert.equal(telLink("12"), "");
});

test("validation explains problems in plain language; empty info is detected", () => {
  const info = sanitizeEmergencyInfo({ contacts: [{ name: "", phone: "+92 300 1234567" }, { name: "Sara", phone: "12" }] });
  const problems = validateEmergencyInfo(info);
  assert.equal(problems.length, 2);
  assert.ok(problems[0].includes("Contact 1") && problems[1].includes("Contact 2"));
  assert.equal(validateEmergencyInfo(sanitizeEmergencyInfo({ contacts: [{ name: "Sara", phone: "+92 300 1234567" }] })).length, 0);
  assert.equal(isEmergencyInfoEmpty(emptyEmergencyInfo()), true);
  assert.equal(isEmergencyInfoEmpty({ bloodType: "A+" }), false);
});

test("feedback message and star handling", () => {
  assert.equal(buildFeedbackMessage(5, "  Great app  "), "Rating: 5/5\nGreat app");
  assert.equal(buildFeedbackMessage(4, ""), "Rating: 4/5");
  assert.equal(buildFeedbackMessage(9, "x").startsWith("Rating: 5/5"), true);
  assert.ok(buildFeedbackMessage(3, "y".repeat(5000)).length <= 2000);
  assert.equal(clampStars("3.6"), 4);
  assert.equal(clampStars(undefined), 0);
  assert.equal(canSubmitFeedback(0), false);
  assert.equal(canSubmitFeedback(1), true);
  assert.equal(starLabel(5), "Loved it");
  assert.equal(starLabel(0), "Tap a star");
});
