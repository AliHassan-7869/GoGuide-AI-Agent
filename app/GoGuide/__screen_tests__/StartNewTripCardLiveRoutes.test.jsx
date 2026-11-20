import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import StartNewTripCard from "../Components/MyTrips/StartNewTripCard";
import { CreateTripContext } from "../context/CreateTripContext";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));

const wrap = (ui) =>
  render(<CreateTripContext.Provider value={{ userData: {}, preferences: {}, tripData: {}, setTripData: jest.fn() }}>{ui}</CreateTripContext.Provider>);

beforeEach(() => {
  mockPush.mockClear();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("Live Routes with no saved trip", () => {
  it("asks the user to plan a trip instead of opening a made-up Dubai route", async () => {
    await wrap(<StartNewTripCard userTrips={[]} onSelectTrip={jest.fn()} onDeleteTrip={jest.fn()} />);
    await fireEvent.press(await screen.findByText("Live Routes"));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert.mock.calls[0][0]).toMatch(/Plan a trip first/i);
    expect(screen.queryByText(/Burj Khalifa/)).toBeNull();
    expect(screen.queryByText(/Dubai Downtown/)).toBeNull();
  });

  it("does the same for a saved trip that has no itinerary", async () => {
    const trips = [{ id: "t1", destination: "Rome, Italy", aiTripPlan: { destination: "Rome, Italy", itinerary: [] } }];
    await wrap(<StartNewTripCard userTrips={trips} onSelectTrip={jest.fn()} onDeleteTrip={jest.fn()} />);
    await fireEvent.press(await screen.findByText("Live Routes"));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Burj Khalifa/)).toBeNull();
  });

  it("the weather shortcut is named for what it opens (saved-location weather)", async () => {
    await wrap(<StartNewTripCard userTrips={[]} onSelectTrip={jest.fn()} onDeleteTrip={jest.fn()} />);
    expect(await screen.findByText("Local Weather")).toBeTruthy();
    expect(screen.queryByText("Weather Ready")).toBeNull();
  });
});
