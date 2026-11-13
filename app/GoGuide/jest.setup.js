// Test-only mocks: UI tests must never reach real storage or Firebase.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("./Configs/FirebaseConfig", () => ({
  auth: { currentUser: null },
  db: {},
  app: {},
}));
