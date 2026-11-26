// Storage for sensitive values (login session, emergency and medical details).
// Native: encrypted, with the key in the Keystore / Keychain. Web has no secure store, so it is unchanged.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createEncryptedStorage } from "./encryptedStorage";

function createNativeStorage() {
  const SecureStore = require("expo-secure-store");
  const Crypto = require("expo-crypto");
  return createEncryptedStorage({
    storage: AsyncStorage,
    secure: SecureStore,
    randomBytes: (length) => Crypto.getRandomBytes(length),
  });
}

export const secureStorage = Platform.OS === "web" ? AsyncStorage : createNativeStorage();
