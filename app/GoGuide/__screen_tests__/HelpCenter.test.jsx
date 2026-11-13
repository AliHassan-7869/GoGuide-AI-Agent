import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import HelpCenter from "../app/help-center";
import { CreateTripContext } from "../context/CreateTripContext";

const renderWithContext = (ui) =>
  render(
    <CreateTripContext.Provider value={{ userData: { email: "t@example.com" }, preferences: {}, tripData: {}, setTripData: jest.fn() }}>
      {ui}
    </CreateTripContext.Provider>
  );

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));
jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(),
}));

describe("Help Center screen", () => {
  it("renders the FAQ list", async () => {
    await renderWithContext(<HelpCenter />);
    expect(screen.getByText("How does the AI Trip Planner work?")).toBeTruthy();
  });

  it("filters FAQs by category", async () => {
    await renderWithContext(<HelpCenter />);
    await fireEvent.press(screen.getByText("Account & Offline"));
    expect(screen.queryByText("How does the AI Trip Planner work?")).toBeNull();
  });
});
