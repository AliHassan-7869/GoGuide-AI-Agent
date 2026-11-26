// Test-only mocks: UI tests must never reach real storage or Firebase.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("./Configs/FirebaseConfig", () => ({
  auth: { currentUser: null },
  db: {},
  app: {},
}));

// Tests never depend on production defaults: give them an explicit (unreachable) backend.
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.goguide.test";

// In-memory stand-ins for the Keystore and its random source.
jest.mock("expo-secure-store", () => {
  const vault = new Map();
  return {
    getItemAsync: jest.fn(async (k) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k, v) => void vault.set(k, v)),
  };
});
jest.mock("expo-crypto", () => ({
  getRandomBytes: (n) => new Uint8Array(require("crypto").randomBytes(n)),
}));
