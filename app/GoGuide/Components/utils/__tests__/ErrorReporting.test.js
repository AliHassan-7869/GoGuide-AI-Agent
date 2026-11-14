import test from "node:test";
import assert from "node:assert/strict";
import { buildErrorReport, isIgnorable, createErrorReporter, installGlobalErrorHandlers } from "../errorReporting.js";

const fixedNow = () => new Date("2026-11-14T10:00:00Z");

test("report fits the Firestore rules: exactly five short string fields", () => {
  const r = buildErrorReport(new Error("x".repeat(5000)), { componentStack: "c".repeat(9000), platform: "web", now: fixedNow });
  assert.deepEqual(Object.keys(r).sort(), ["componentStack", "message", "platform", "stack", "timestamp"]);
  assert.ok(r.message.length <= 1000 && r.stack.length <= 2000 && r.componentStack.length <= 2000);
  assert.equal(r.timestamp, "2026-11-14T10:00:00.000Z");
  for (const k of ["message", "stack", "componentStack"]) assert.equal(typeof r[k], "string");
});

test("odd inputs never throw and still produce strings", () => {
  for (const bad of [null, undefined, "plain string", 42, {}, { message: undefined }]) {
    const r = buildErrorReport(bad, { now: fixedNow });
    assert.equal(typeof r.message, "string");
    assert.equal(typeof r.stack, "string");
  }
});

test("known noise is ignored", () => {
  assert.equal(isIgnorable(new Error("Minified React error #418; visit ...")), true);
  assert.equal(isIgnorable("ResizeObserver loop completed with undelivered notifications."), true);
  assert.equal(isIgnorable(new Error("Cannot read properties of undefined")), false);
});

test("reporter de-duplicates, caps per session, and survives a failing send", async () => {
  const sent = [];
  const report = createErrorReporter({ send: (p) => sent.push(p), maxPerSession: 3, now: fixedNow });
  const e1 = new Error("boom");
  assert.equal(report(e1), true);
  assert.equal(report(e1), false, "same error twice is reported once");
  assert.equal(report(new Error("two")), true);
  assert.equal(report(new Error("three")), true);
  assert.equal(report(new Error("four")), false, "cap reached");
  assert.equal(sent.length, 3);

  const failing = createErrorReporter({ send: async () => { throw new Error("offline"); } });
  assert.equal(failing(new Error("x")), true);
  await new Promise((r) => setTimeout(r, 10)); // a rejected send must not crash the process
  assert.equal(createErrorReporter({})(new Error("no sender")), false);
});

test("global handlers: web events and the native handler both report, and the old handler still runs", () => {
  const listeners = {};
  let globalHandler = null;
  const oldCalls = [];
  const env = {
    document: {},
    addEventListener: (type, fn) => { listeners[type] = fn; },
    ErrorUtils: { getGlobalHandler: () => (e, fatal) => oldCalls.push([e.message, fatal]), setGlobalHandler: (fn) => { globalHandler = fn; } },
  };
  const reported = [];
  assert.deepEqual(installGlobalErrorHandlers((e) => reported.push(String(e?.message || e)), env), ["web", "native"]);
  listeners.error({ error: new Error("window error") });
  listeners.unhandledrejection({ reason: new Error("rejected") });
  globalHandler(new Error("native crash"), true);
  assert.deepEqual(reported, ["window error", "rejected", "native crash"]);
  assert.deepEqual(oldCalls, [["native crash", true]]);
  assert.deepEqual(installGlobalErrorHandlers(() => {}, {}), []);
});
