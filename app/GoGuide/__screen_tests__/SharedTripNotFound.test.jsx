import React from "react";
import { render, screen } from "@testing-library/react-native";
import SharedTripView from "../app/trip";

let mockParams = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));
jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(async () => ({ exists: () => false })),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

describe("Shared trip viewer", () => {
  it("says 'Trip not found' for an unknown id instead of showing a made-up trip", async () => {
    mockParams = { id: "does-not-exist" };
    await render(<SharedTripView />);
    expect(await screen.findByText("Trip not found")).toBeTruthy();
    expect(screen.queryByText(/Dubai/)).toBeNull();
    expect(screen.queryByText(/Burj/)).toBeNull();
  });

  it("says 'Trip not found' when there is no id at all", async () => {
    mockParams = {};
    await render(<SharedTripView />);
    expect(await screen.findByText("Trip not found")).toBeTruthy();
    expect(screen.queryByText(/Dubai/)).toBeNull();
  });
});
