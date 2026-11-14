import test from "node:test";
import assert from "node:assert/strict";
import { titleForPath, DEFAULT_TITLE } from "../pageTitles.js";

test("known routes get their own title", () => {
  assert.equal(titleForPath("/profile"), "Profile | GoGuide AI");
  assert.equal(titleForPath("/auth/sign-in"), "Sign In | GoGuide AI");
  assert.equal(titleForPath("/auth/sign-in/index"), "Sign In | GoGuide AI");
  assert.equal(titleForPath("/create-trip/select-dates"), "Plan Your Trip | GoGuide AI");
  assert.equal(titleForPath("/help-center/"), "Help & Support | GoGuide AI");
});

test("home and unknown routes keep the default title", () => {
  assert.equal(titleForPath("/"), DEFAULT_TITLE);
  assert.equal(titleForPath(""), DEFAULT_TITLE);
  assert.equal(titleForPath(undefined), DEFAULT_TITLE);
  assert.equal(titleForPath("/nope"), DEFAULT_TITLE);
});
