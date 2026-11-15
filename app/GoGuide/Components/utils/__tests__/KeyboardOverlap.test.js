import test from "node:test";
import assert from "node:assert/strict";
import { overlapFor, keyboardTopFromEvent, webOverlap } from "../keyboardOverlap.js";

test("keyboard covering the bottom of the view: pad by exactly the covered part", () => {
  // phone is 800dp tall, keyboard top at 500dp, our view ends at the bottom of the screen
  assert.equal(overlapFor(800, 500), 300);
});

test("window already resized above the keyboard: nothing to add (no double spacing)", () => {
  assert.equal(overlapFor(500, 500), 0);
  assert.equal(overlapFor(480, 500), 0);
});

test("never negative, never absurd, never NaN", () => {
  assert.equal(overlapFor(100, 5000), 0);
  assert.equal(overlapFor(99999, 10), 700);
  for (const bad of [undefined, null, NaN, "x"]) {
    assert.equal(overlapFor(bad, 500), 0);
    assert.equal(overlapFor(800, bad), 0);
  }
  assert.equal(overlapFor(800.4, 500.2), 300);
});

test("keyboard top comes from screenY, with a fallback from height", () => {
  assert.equal(keyboardTopFromEvent({ endCoordinates: { screenY: 500, height: 300 } }, 800), 500);
  assert.equal(keyboardTopFromEvent({ endCoordinates: { height: 300 } }, 800), 500);
  assert.equal(keyboardTopFromEvent({ endCoordinates: { screenY: 0, height: 300 } }, 800), 500);
  assert.equal(keyboardTopFromEvent({}, 800), null);
  assert.equal(keyboardTopFromEvent(undefined, 800), null);
  assert.equal(keyboardTopFromEvent({ endCoordinates: { height: 300 } }, undefined), null);
});

test("mobile web: iPhone Safari keyboard is covered space, Chrome resize and toolbars are not", () => {
  // Safari: layout stays 800 tall, visual viewport shrinks to 500 -> keyboard covers 300
  assert.equal(webOverlap({ innerHeight: 800, height: 500, offsetTop: 0, scale: 1 }), 300);
  // Safari scrolled the page up by 120: the visible area ends lower, so less is covered
  assert.equal(webOverlap({ innerHeight: 800, height: 500, offsetTop: 120, scale: 1 }), 180);
  // Chrome (resizes-content): the page itself shrank too
  assert.equal(webOverlap({ innerHeight: 500, height: 500, offsetTop: 0, scale: 1 }), 0);
  // browser toolbar showing or hiding is small
  assert.equal(webOverlap({ innerHeight: 800, height: 740, offsetTop: 0, scale: 1 }), 0);
  // pinch-zoom shrinks the visual viewport but is not a keyboard
  assert.equal(webOverlap({ innerHeight: 800, height: 400, offsetTop: 0, scale: 2 }), 0);
  assert.equal(webOverlap({}), 0);
  assert.equal(webOverlap(), 0);
});

test("mobile web: a tab bar under the chat area is also under the keyboard, so measure from the chat area", () => {
  // Chat area ends at 734 (66px tab bar below it); keyboard covers 500..800 -> lift the chat area by 234, not 300
  assert.equal(webOverlap({ innerHeight: 800, height: 500, offsetTop: 0, scale: 1, containerBottom: 734 }), 234);
  // chat area sits above the keyboard already
  assert.equal(webOverlap({ innerHeight: 800, height: 500, offsetTop: 0, scale: 1, containerBottom: 480 }), 0);
  assert.equal(webOverlap({ innerHeight: 800, height: 740, offsetTop: 0, scale: 1, containerBottom: 734 }), 0);
});
