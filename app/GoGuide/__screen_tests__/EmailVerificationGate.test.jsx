import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { EMAIL_VERIFY_MESSAGE } from "../Components/utils/emailVerification";
import { sendEmailVerification } from "firebase/auth";

const mockUnverifiedUser = () => ({
  isAnonymous: false,
  email: "traveler@example.com",
  emailVerified: false,
  providerData: [{ providerId: "password" }],
  reload: jest.fn(async () => {}),
  getIdToken: jest.fn(async () => "token"),
});

jest.mock("firebase/auth", () => ({ sendEmailVerification: jest.fn(async () => {}) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), canGoBack: () => true }),
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));
const mockPush = jest.fn();

const { auth } = require("../Configs/FirebaseConfig");

describe("AI client: unverified email accounts", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    auth.currentUser = mockUnverifiedUser();
  });
  afterEach(() => {
    auth.currentUser = null;
  });

  it("refuses to call the server and explains what to do", async () => {
    const { askTravelAssistant } = require("../Configs/AiModel");
    await expect(askTravelAssistant("hello", [], null)).rejects.toThrow(EMAIL_VERIFY_MESSAGE);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("goes ahead once the user has verified (account reload + fresh token)", async () => {
    const user = mockUnverifiedUser();
    user.reload = jest.fn(async () => {
      user.emailVerified = true;
    });
    auth.currentUser = user;
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ status: "success", data: { reply: "hi" } }) }));
    const { askTravelAssistant } = require("../Configs/AiModel");
    await expect(askTravelAssistant("hello", [], null)).resolves.toBe("hi");
    expect(user.getIdToken).toHaveBeenCalledWith(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not block guests", async () => {
    auth.currentUser = { isAnonymous: true, email: null, emailVerified: false, providerData: [], getIdToken: jest.fn(async () => "t") };
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ status: "success", data: { reply: "ok" } }) }));
    const { askTravelAssistant } = require("../Configs/AiModel");
    await expect(askTravelAssistant("hello", [], null)).resolves.toBe("ok");
  });
});

describe("Review trip: Generate AI Itinerary", () => {
  const { CreateTripContext } = require("../context/CreateTripContext");
  const ReviewTrip = require("../app/create-trip/review-trip").default;
  const tripData = {
    toLocation: { name: "Istanbul, Turkey", coordinates: { lat: 41, lng: 29 } },
    fromLocation: { name: "Lahore, Pakistan" },
    startDate: "2030-05-01",
    endDate: "2030-05-04",
    totalNoOfDays: 3,
    budget: "Moderate",
    traveler: { title: "Solo" },
    interestsDetails: [{ name: "Food" }],
  };
  const renderReview = () =>
    render(
      <CreateTripContext.Provider value={{ userData: {}, preferences: {}, tripData, setTripData: jest.fn() }}>
        <ReviewTrip />
      </CreateTripContext.Provider>
    );

  beforeEach(() => {
    mockPush.mockClear();
    sendEmailVerification.mockClear();
    auth.currentUser = mockUnverifiedUser();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ daily: {} }) }));
  });
  afterEach(() => {
    auth.currentUser = null;
    jest.restoreAllMocks();
  });

  it("stops an unverified account, tells them to verify, and offers to resend", async () => {
    await renderReview();
    await fireEvent.press(await screen.findByText(/Generate AI Itinerary/));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const [title, message, buttons] = Alert.alert.mock.calls[0];
    expect(title).toBe("Verify your email");
    expect(message).toContain("traveler@example.com");
    expect(mockPush).not.toHaveBeenCalledWith("/create-trip/generate-trip");

    const resend = buttons.find((b) => b.text === "Resend email");
    await resend.onPress();
    expect(sendEmailVerification).toHaveBeenCalledTimes(1);
  });
});
