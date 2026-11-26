// Encrypts values before they reach AsyncStorage. The AES key lives in the hardware-backed secure store
// (Android Keystore / iOS Keychain); only ciphertext is written to ordinary app storage.
// The auth session is too large for SecureStore itself, which is why the data stays in AsyncStorage.
// Pure factory (no React Native imports) so it can be unit-tested.

import { gcm } from "@noble/ciphers/aes";
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from "@noble/ciphers/utils";

const PREFIX = "enc1:";
const KEY_NAME = "goguide_storage_key_v1";
const NONCE_BYTES = 12;

/**
 * @param storage     AsyncStorage-like: getItem / setItem / removeItem
 * @param secure      SecureStore-like: getItemAsync / setItemAsync
 * @param randomBytes (length) => Uint8Array
 */
export function createEncryptedStorage({ storage, secure, randomBytes }) {
  let keyPromise = null;

  // A new key is only created when the store positively reports there is none. If reading fails we
  // throw instead, so a temporary Keystore error can never replace the key and orphan existing data.
  const loadKey = () => {
    if (!keyPromise) {
      keyPromise = (async () => {
        const existing = await secure.getItemAsync(KEY_NAME);
        if (existing) return hexToBytes(existing);
        const created = randomBytes(32);
        await secure.setItemAsync(KEY_NAME, bytesToHex(created));
        return created;
      })().catch((error) => {
        keyPromise = null;
        throw error;
      });
    }
    return keyPromise;
  };

  const encrypt = async (name, value) => {
    const key = await loadKey();
    const nonce = randomBytes(NONCE_BYTES);
    // The entry name is authenticated too, so one entry's ciphertext cannot be moved to another.
    const sealed = gcm(key, nonce, utf8ToBytes(name)).encrypt(utf8ToBytes(String(value)));
    return `${PREFIX}${bytesToHex(nonce)}:${bytesToHex(sealed)}`;
  };

  const setItem = async (name, value) => storage.setItem(name, await encrypt(name, value));

  const getItem = async (name) => {
    const raw = await storage.getItem(name);
    if (raw === null || raw === undefined) return null;

    if (!raw.startsWith(PREFIX)) {
      // Written by an older version of the app: hand it back and encrypt it in place.
      try {
        await setItem(name, raw);
      } catch {
        // Keep the old value; migration is retried on the next read.
      }
      return raw;
    }

    try {
      const [nonceHex, sealedHex] = raw.slice(PREFIX.length).split(":");
      const key = await loadKey();
      return bytesToUtf8(gcm(key, hexToBytes(nonceHex), utf8ToBytes(name)).decrypt(hexToBytes(sealedHex)));
    } catch {
      return null; // key lost or data damaged: treat as not stored
    }
  };

  return { getItem, setItem, removeItem: (name) => storage.removeItem(name) };
}
