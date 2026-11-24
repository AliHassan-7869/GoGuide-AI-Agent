import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import MyTrip from "../app/(tabs)/mytrip";
import { CreateTripContext } from "../context/CreateTripContext";
import { buildCuratedPlan } from "../Components/utils/CuratedPlans";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb) => {
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
  verifyTripStops: jest.fn(async () => ({})),
}));

const plan = buildCuratedPlan("Istanbul", 3, "Moderate");
const wrap = () => (
  <CreateTripContext.Provider
    value={{
      tripData: { aiTripPlan: plan, toLocation: { name: "Istanbul" }, totalNoOfDays: 3 },
      setTripData: jest.fn(), userData: { name: "Traveler", email: "" }, preferences: {}, setPreferences: jest.fn(), uid: null,
    }}
  >
    <MyTrip />
  </CreateTripContext.Provider>
);

async function openMenu() {
  await render(wrap());
  await fireEvent.press(await screen.findByText("Continue your plan"));
  await fireEvent.press(await screen.findByLabelText("More trip actions"));
}

beforeEach(() => {
  mockPush.mockClear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe("Trip actions sheet", () => {
  it("lists every action", async () => {
    await openMenu();
    for (const label of [
      "Download PDF", "Printable itinerary", "Share trip", "Add to calendar", "Save to My Bookings",
      "Packing list", "Live safety alerts", "Explore destinations", "Plan a new trip", "Delete this trip",
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it("closes the sheet, then runs the tapped action after a short delay (navigation rows)", async () => {
    await openMenu();
    await fireEvent.press(screen.getByLabelText("Packing list"));
    expect(mockPush).not.toHaveBeenCalled(); // waits for the sheet to close first
    await act(async () => { jest.advanceTimersByTime(200); });
    expect(mockPush).toHaveBeenCalledWith("/packing-checklist");
  });

  it("each navigation row goes to its own screen", async () => {
    await openMenu();
    await fireEvent.press(screen.getByLabelText("Live safety alerts"));
    await act(async () => { jest.advanceTimersByTime(200); });
    expect(mockPush).toHaveBeenLastCalledWith("/safety-alerts");
    await fireEvent.press(await screen.findByLabelText("More trip actions"));
    await fireEvent.press(screen.getByLabelText("Explore destinations"));
    await act(async () => { jest.advanceTimersByTime(200); });
    expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/discover");
  });
});
