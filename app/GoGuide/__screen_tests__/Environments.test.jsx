// jest-expo runs with __DEV__ = true, so these exercise a *development* build.
const ENV_KEYS = [
  "EXPO_PUBLIC_APP_ENV", "EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_USE_PRODUCTION_SERVICES",
  "EXPO_PUBLIC_FIREBASE_API_KEY", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", "EXPO_PUBLIC_FIREBASE_PROJECT_ID", "EXPO_PUBLIC_FIREBASE_APP_ID",
];
const saved = {};
beforeEach(() => {
  ENV_KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; });
  jest.resetModules();
  global.fetch = jest.fn();
});
afterEach(() => {
  ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
});

const loadActualFirebaseConfig = () => {
  jest.doMock("firebase/app", () => ({ initializeApp: jest.fn(() => ({})), getApps: () => [], getApp: jest.fn() }));
  jest.doMock("firebase/auth", () => ({ getAuth: jest.fn(() => ({})), initializeAuth: jest.fn(() => ({})), getReactNativePersistence: jest.fn() }));
  jest.doMock("firebase/firestore", () => ({ getFirestore: jest.fn(() => ({})) }));
  return jest.requireActual("../Configs/FirebaseConfig");
};

describe("A development build does not silently use production", () => {
  it("Firebase refuses to start without configuration", () => {
    expect(() => loadActualFirebaseConfig()).toThrow(/not configured for the "development" environment/);
  });

  it("Firebase starts with a complete staging configuration and uses that project", () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = "k";
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = "goguide-staging.firebaseapp.com";
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = "goguide-staging";
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = "1:1:web:x";
    const { initializeApp } = require("firebase/app");
    jest.doMock("firebase/app", () => ({ initializeApp, getApps: () => [], getApp: jest.fn() }));
    expect(() => loadActualFirebaseConfig()).not.toThrow();
    expect(initializeApp.mock.calls[0][0].projectId).toBe("goguide-staging");
  });

  it("Firebase uses production only when explicitly opted in", () => {
    process.env.EXPO_PUBLIC_USE_PRODUCTION_SERVICES = "true";
    const { initializeApp } = require("firebase/app");
    jest.doMock("firebase/app", () => ({ initializeApp, getApps: () => [], getApp: jest.fn() }));
    loadActualFirebaseConfig();
    expect(initializeApp.mock.calls[0][0].projectId).toBe("goguideai");
  });

  it("AI calls fail with a clear message and never reach the network when no backend is configured", async () => {
    jest.doMock("../Configs/FirebaseConfig", () => ({ auth: { currentUser: { isAnonymous: true, getIdToken: async () => "t" } }, db: {}, app: {} }));
    const { askTravelAssistant } = require("../Configs/AiModel");
    await expect(askTravelAssistant("hi", [], null)).rejects.toThrow(/no backend configured for the "development" environment/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("AI calls go to the configured staging backend", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://staging.example.com/";
    jest.doMock("../Configs/FirebaseConfig", () => ({ auth: { currentUser: { isAnonymous: true, getIdToken: async () => "t" } }, db: {}, app: {} }));
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ status: "success", data: { reply: "ok" } }) }));
    const { askTravelAssistant } = require("../Configs/AiModel");
    await expect(askTravelAssistant("hi", [], null)).resolves.toBe("ok");
    expect(global.fetch.mock.calls[0][0]).toBe("https://staging.example.com/chat");
  });
});
