import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import MyTrip from "../app/(tabs)/mytrip";
import { CreateTripContext } from "../context/CreateTripContext";
import { buildCuratedPlan } from "../Components/utils/CuratedPlans";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb) => {
    // run the focus callback once, like a screen gaining focus
    const React = require("react");
    React.useEffect(() => cb(), [cb]);
  },
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(), query: jest.fn(), where: jest.fn(), getDocs: jest.fn(async () => ({ docs: [], forEach: () => {} })),
  orderBy: jest.fn(), limit: jest.fn(), addDoc: jest.fn(), deleteDoc: jest.fn(), doc: jest.fn(), updateDoc: jest.fn(),
}));
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn(), selectionAsync: jest.fn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
jest.mock("../Components/utils/PlaceVerifier", () => ({
  ...jest.requireActual("../Components/utils/PlaceVerifier"),
  verifyTripStops: jest.fn(async () => ({})), // never touch the network in tests
}));

const wrap = (tripData) => (
  <CreateTripContext.Provider
    value={{ tripData, setTripData: jest.fn(), userData: { name: "Traveler", email: "" }, preferences: {}, setPreferences: jest.fn(), uid: null }}
  >
    <MyTrip />
  </CreateTripContext.Provider>
);

describe("My Trip screen", () => {
  it("opens on the hub, offering to continue a restored plan", async () => {
    const plan = buildCuratedPlan("Istanbul", 3, "Moderate");
    await render(wrap({ aiTripPlan: plan, toLocation: { name: "Istanbul" }, totalNoOfDays: 3 }));
    expect(await screen.findByText("Continue your plan")).toBeTruthy();
  });

  it("shows no resume card when there is no trip", async () => {
    await render(wrap({}));
    expect(screen.queryByText("Continue your plan")).toBeNull();
  });

  it("resumes into the itinerary with day filters and verified stops", async () => {
    const plan = buildCuratedPlan("Istanbul", 3, "Moderate");
    await render(wrap({ aiTripPlan: plan, toLocation: { name: "Istanbul" }, totalNoOfDays: 3 }));
    await fireEvent.press(await screen.findByText("Continue your plan"));
    expect((await screen.findAllByText("Day 1")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Verified on map").length).toBeGreaterThan(0);
    // filtering to one day keeps the screen alive (regression guard for the day chips)
    await fireEvent.press(screen.getAllByText("Day 2")[0]);
    expect(screen.getAllByText(/Day 2/).length).toBeGreaterThan(0);
  });
});
