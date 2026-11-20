import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import MyBookings from "../app/my-bookings";
import OfflineVaultModal from "../Components/MyTrips/OfflineVaultModal";
import ShareTripModal from "../Components/MyTrips/ShareTripModal";
import { CreateTripContext } from "../context/CreateTripContext";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(async () => ({ empty: true, docs: [] })),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(async () => {}),
}));

const theme = { card: "#fff", border: "#ddd", text: "#000", subtext: "#555", bg: "#fff", isDark: false };
const booking = {
  id: "bk1", type: "Hotels", status: "Upcoming", bookingRef: "PLAN-H-ABC123", title: "Hotel Roma",
  subtitle: "Via 1", checkIn: "May 1, 2030", checkOut: "May 4, 2030", details: "Planned stay (not booked yet)",
  price: "$150", destination: "Rome", userEmail: "a@b.co",
};

beforeEach(async () => {
  Clipboard.setStringAsync.mockReset();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await AsyncStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

const alertTexts = () => Alert.alert.mock.calls.map((c) => c.join(" "));

describe("Copy buttons really copy", () => {
  it("my-bookings: copies the plan reference, and only then says 'Copied'", async () => {
    Clipboard.setStringAsync.mockResolvedValue(true);
    await AsyncStorage.setItem("@goguide_user_bookings", JSON.stringify([booking]));
    await render(
      <CreateTripContext.Provider value={{ userData: {}, preferences: {}, tripData: {}, setTripData: jest.fn() }}>
        <MyBookings />
      </CreateTripContext.Provider>
    );
    await fireEvent.press(await screen.findByLabelText("Copy booking reference PLAN-H-ABC123"));
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith("PLAN-H-ABC123"));
    await waitFor(() => expect(alertTexts().join("|")).toMatch(/Copied/));
  });

  it("my-bookings: if copying fails it does not claim success and shows the code instead", async () => {
    Clipboard.setStringAsync.mockRejectedValue(new Error("denied"));
    await AsyncStorage.setItem("@goguide_user_bookings", JSON.stringify([booking]));
    await render(
      <CreateTripContext.Provider value={{ userData: {}, preferences: {}, tripData: {}, setTripData: jest.fn() }}>
        <MyBookings />
      </CreateTripContext.Provider>
    );
    await fireEvent.press(await screen.findByLabelText("Copy booking reference PLAN-H-ABC123"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const text = alertTexts().join("|");
    expect(text).not.toMatch(/Copied reference|has been copied/i);
    expect(text).toMatch(/PLAN-H-ABC123/);
  });

  it("offline vault: copies the hotel details", async () => {
    Clipboard.setStringAsync.mockResolvedValue(true);
    await render(
      <OfflineVaultModal visible destination="Rome, Italy" hotels={[{ name: "Hotel Roma", address: "Via 1" }]} onClose={jest.fn()} theme={theme} />
    );
    await fireEvent.press((await screen.findAllByText("Copy"))[0]);
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith("Hotel Roma\nVia 1"));
    await waitFor(() => expect(alertTexts().join("|")).toMatch(/Copied to Clipboard/));
  });

  it("offline vault: a failed copy is reported, not claimed", async () => {
    Clipboard.setStringAsync.mockRejectedValue(new Error("denied"));
    await render(
      <OfflineVaultModal visible destination="Rome, Italy" hotels={[{ name: "Hotel Roma", address: "Via 1" }]} onClose={jest.fn()} theme={theme} />
    );
    await fireEvent.press((await screen.findAllByText("Copy"))[0]);
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(alertTexts().join("|")).not.toMatch(/Copied to Clipboard/);
  });

  it("share modal: copies the link; the button only turns to 'Copied' when it worked", async () => {
    Clipboard.setStringAsync.mockResolvedValue(true);
    await render(<ShareTripModal visible tripId="trip_1" destination="Rome" plan={{ destination: "Rome" }} onClose={jest.fn()} theme={theme} />);
    await fireEvent.press(await screen.findByText("Copy"));
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith(expect.stringContaining("/trip/trip_1")));
    expect(await screen.findByText("Copied")).toBeTruthy();
  });

  it("share modal: a failed copy leaves the button as 'Copy'", async () => {
    Clipboard.setStringAsync.mockRejectedValue(new Error("denied"));
    await render(<ShareTripModal visible tripId="trip_1" destination="Rome" plan={{ destination: "Rome" }} onClose={jest.fn()} theme={theme} />);
    await fireEvent.press(await screen.findByText("Copy"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(screen.queryByText("Copied")).toBeNull();
    expect(alertTexts().join("|")).not.toMatch(/Link Copied/);
  });
});
