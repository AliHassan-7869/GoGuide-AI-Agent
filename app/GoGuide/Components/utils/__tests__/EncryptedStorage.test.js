import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createEncryptedStorage } from "../encryptedStorage.js";

function fakes() {
  const disk = new Map();
  const vault = new Map();
  const storage = {
    getItem: async (k) => (disk.has(k) ? disk.get(k) : null),
    setItem: async (k, v) => void disk.set(k, v),
    removeItem: async (k) => void disk.delete(k),
  };
  const secure = {
    getItemAsync: async (k) => vault.get(k) ?? null,
    setItemAsync: async (k, v) => void vault.set(k, v),
  };
  const make = (overrides = {}) =>
    createEncryptedStorage({ storage, secure, randomBytes: (n) => new Uint8Array(randomBytes(n)), ...overrides });
  return { disk, vault, secure, make };
}

test("values are encrypted on disk and read back across restarts", async () => {
  const { disk, make } = fakes();
  await make().setItem("session", '{"refreshToken":"s3cret","name":"Zoë"}');
  assert.ok(disk.get("session").startsWith("enc1:"));
  assert.ok(!disk.get("session").includes("s3cret"));
  assert.equal(await make().getItem("session"), '{"refreshToken":"s3cret","name":"Zoë"}');
});

test("an existing plaintext session is returned and then encrypted, so nobody is signed out", async () => {
  const { disk, make } = fakes();
  disk.set("session", '{"refreshToken":"old"}');
  assert.equal(await make().getItem("session"), '{"refreshToken":"old"}');
  assert.ok(disk.get("session").startsWith("enc1:"));
  assert.equal(await make().getItem("session"), '{"refreshToken":"old"}');
});

test("tampered or moved ciphertext is rejected", async () => {
  const { disk, make } = fakes();
  await make().setItem("a", "value");
  disk.set("b", disk.get("a"));
  assert.equal(await make().getItem("b"), null);
  disk.set("a", disk.get("a").slice(0, -2) + (disk.get("a").endsWith("00") ? "11" : "00"));
  assert.equal(await make().getItem("a"), null);
});

test("a failing key store never overwrites the key and never writes plaintext", async () => {
  const { disk, vault, secure, make } = fakes();
  await make().setItem("a", "value");
  const originalKey = vault.get("goguide_storage_key_v1");
  const broken = make({ secure: { ...secure, getItemAsync: async () => { throw new Error("keystore busy"); } } });
  assert.equal(await broken.getItem("a"), null);
  await assert.rejects(broken.setItem("c", "plain"));
  assert.equal(disk.has("c"), false);
  assert.equal(vault.get("goguide_storage_key_v1"), originalKey);
  assert.equal(await make().getItem("a"), "value");
});
