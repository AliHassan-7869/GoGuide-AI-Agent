import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import SafetyAlerts from "../app/safety-alerts";
import { CreateTripContext } from "../context/CreateTripContext";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));
jest.mock("../Configs/AiModel", () => ({ fetchDestinationSafety: jest.fn(async () => null) }));

const renderWith = (tripData) =>
  render(
    <CreateTripContext.Provider value={{ userData: {}, preferences: {}, tripData, setTripData: jest.fn() }}>
      <SafetyAlerts />
    </CreateTripContext.Provider>
  );

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ json: async () => ({ current_weather: { temperature: 21, windspeed: 5 } }) }));
});

describe("Safety alerts: emergency contacts and weather", () => {
  it("shows the trip country's numbers (Pakistan), not 911 and not a personal number", async () => {
    await renderWith({ toLocation: { name: "Lahore, Pakistan", coordinates: { lat: 31.5, lng: 74.3 } } });
    await fireEvent.press(await screen.findByLabelText("View emergency contacts"));
    expect(await screen.findByText("1122")).toBeTruthy();
    expect(screen.getByText("15")).toBeTruthy();
    expect(screen.queryByText("911")).toBeNull();
    expect(screen.queryByText(/0318/)).toBeNull();
    expect(screen.queryByText("Traveller Assistance")).toBeNull();
    expect(screen.getByText(/Numbers for Pakistan/)).toBeTruthy();
  });

  it("with no trip, shows the international number and says it is unverified, with no Paris weather", async () => {
    await renderWith({});
    await fireEvent.press(await screen.findByLabelText("View emergency contacts"));
    expect(await screen.findByText("International emergency number")).toBeTruthy();
    expect(screen.getByText(/don't have verified numbers/)).toBeTruthy();
    expect(screen.queryByText("911")).toBeNull();
    expect(await screen.findByText(/Open or plan a trip to see the weather/)).toBeTruthy();
    await waitFor(() => {
      const urls = global.fetch.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes("48.8566"))).toBe(false);
      expect(urls.some((u) => u.includes("open-meteo"))).toBe(false);
    });
  });

  it("fetches weather at the trip's own coordinates", async () => {
    await renderWith({ toLocation: { name: "Tokyo, Japan", coordinates: { lat: 35.68, lng: 139.69 } } });
    await waitFor(() => {
      const urls = global.fetch.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes("latitude=35.68") && u.includes("longitude=139.69"))).toBe(true);
    });
  });
});
