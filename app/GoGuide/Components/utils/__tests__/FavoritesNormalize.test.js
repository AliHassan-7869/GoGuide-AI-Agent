import test from "node:test";
import assert from "node:assert/strict";
import { safeImageUri, prettyLabel, normalizeFavorite, cleanFavorites, FALLBACK_FAVORITE_IMAGE } from "../favoritesNormalize.js";

test("safeImageUri accepts https, upgrades http, and rejects everything else", () => {
  assert.equal(safeImageUri("https://a.com/x.jpg"), "https://a.com/x.jpg");
  assert.equal(safeImageUri("http://a.com/x.jpg"), "https://a.com/x.jpg");
  assert.equal(safeImageUri("//a.com/x.jpg"), "https://a.com/x.jpg");
  assert.equal(safeImageUri({ uri: "http://a.com/y.jpg" }), "https://a.com/y.jpg");
  for (const bad of ["", "   ", "CmRaAAAAphotoReference", 42, null, undefined, {}, [], "file:///x.png", "javascript:alert(1)"]) {
    assert.equal(safeImageUri(bad), FALLBACK_FAVORITE_IMAGE, `should fall back for ${String(bad)}`);
  }
  assert.ok(safeImageUri("data:image/png;base64,AAA").startsWith("data:image/"));
});

test("prettyLabel capitalizes words and never returns an object or empty text", () => {
  assert.equal(prettyLabel("Hotel • dubai"), "Hotel • Dubai");
  assert.equal(prettyLabel("cities"), "Cities");
  assert.equal(prettyLabel(""), "Destination");
  assert.equal(prettyLabel({ a: 1 }), "Destination");
  assert.equal(prettyLabel("x".repeat(200)).length, 40);
});

test("normalizeFavorite survives broken data", () => {
  assert.equal(normalizeFavorite(null), null);
  assert.equal(normalizeFavorite({}), null);
  assert.equal(normalizeFavorite({ name: "   " }), null);
  const f = normalizeFavorite({ name: "Tokyo", image: { weird: true }, rating: { value: 5 }, category: { x: 1 } });
  assert.equal(f.id, "Tokyo");
  assert.equal(f.image, FALLBACK_FAVORITE_IMAGE);
  assert.equal(f.rating, "");
  assert.equal(f.category, "Destination");
  assert.equal(normalizeFavorite({ title: "Paris", rating: 4.25 }).rating, "4.3");
  assert.equal(normalizeFavorite({ name: "A", id: 7 }).id, "7");
});

test("cleanFavorites removes duplicates by name (case-insensitive), invalid entries and non-arrays", () => {
  const out = cleanFavorites([
    { id: "a", name: "Tokyo, Japan", rating: "4.9" },
    { id: "fav_user_gmail_com_Tokyo", name: "tokyo, japan" },
    null,
    "junk",
    { name: "Paris, France" },
  ]);
  assert.deepEqual(out.map((f) => f.name), ["Tokyo, Japan", "Paris, France"]);
  assert.equal(out[0].id, "a");
  assert.deepEqual(cleanFavorites(undefined), []);
  assert.deepEqual(cleanFavorites({ not: "array" }), []);
});
