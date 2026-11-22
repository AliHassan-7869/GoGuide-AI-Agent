import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import TripSummer from "../app/create-trip/trip-summer";
import ReviewTrip from "../app/create-trip/review-trip";
import StartNewTripCard from "../Components/MyTrips/StartNewTripCard";
import { CreateTripContext } from "../context/CreateTripContext";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (cb) => require("react").useEffect(cb, [cb]),
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));
jest.mock("firebase/auth", () => ({ sendEmailVerification: jest.fn() }));

const { auth } = require("../Configs/FirebaseConfig");

// A stand-in for the context's state: applies updates the way React's setState would.
function makeContext(initial) {
  const ctx = { tripData: initial, userData: {}, preferences: {} };
  ctx.setTripData = jest.fn((next) => {
    ctx.tripData = typeof next === "function" ? next(ctx.tripData) : next;
  });
  return ctx;
}
const wrap = (ctx, ui) => render(<CreateTripContext.Provider value={ctx}>{ui}</CreateTripContext.Provider>);

beforeEach(() => {
  mockPush.mockClear();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ daily: {} }) }));
  auth.currentUser = { isAnonymous: false, email: "a@b.co", emailVerified: true, providerData: [{ providerId: "password" }] };
});
afterEach(() => {
  auth.currentUser = null;
  jest.restoreAllMocks();
});

// Destination cards are buttons labelled "Select <city>, <country> itinerary, ..."
const tokyoCard = () =>
  screen.queryAllByRole("button").find((b) => /^Select Tokyo, Japan itinerary/.test(b.props.accessibilityLabel || ""));
const findTokyoCard = async () => {
  await waitFor(() => expect(tokyoCard()).toBeTruthy());
  return tokyoCard();
};
const alertTitles = () => Alert.alert.mock.calls.map((c) => c[0]);

describe("Quick plan entry points lead to a valid review screen", () => {
  it("'Generate 3-Day Plan' sets real dates and the canonical duration", async () => {
    const ctx = makeContext({ toLocation: { name: "Rome, Italy", coordinates: { lat: 41.9, lng: 12.5 } } });
    await wrap(ctx, <TripSummer />);
    await fireEvent.press(await screen.findByText(/Generate 3-Day Plan/));
    expect(mockPush).toHaveBeenCalledWith("/create-trip/review-trip");
    expect(ctx.tripData.totalNoOfDays).toBe(3);
    expect(ctx.tripData.startDate).toBeInstanceOf(Date);
    expect(ctx.tripData.endDate).toBeInstanceOf(Date);
    expect("totalDays" in ctx.tripData).toBe(false);
    expect(ctx.tripData.toLocation.name).toBe("Rome, Italy");
  });

  it("...and the review screen accepts it (no 'Dates Missing')", async () => {
    const ctx = makeContext({ toLocation: { name: "Rome, Italy", coordinates: { lat: 41.9, lng: 12.5 } } });
    const { unmount } = await wrap(ctx, <TripSummer />);
    await fireEvent.press(await screen.findByText(/Generate 3-Day Plan/));
    unmount();
    mockPush.mockClear();
    await wrap(ctx, <ReviewTrip />);
    await fireEvent.press(await screen.findByText(/Generate AI Itinerary/));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/create-trip/generate-trip"));
    expect(alertTitles()).not.toContain("Dates Missing");
    expect(alertTitles()).not.toContain("Destination Missing");
  });
});
