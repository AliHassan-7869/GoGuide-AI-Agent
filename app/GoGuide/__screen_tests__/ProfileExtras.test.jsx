import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import EmergencyInfo from "../app/emergency-info";
import { secureStorage } from "../Components/utils/secureStorage";
import Feedback from "../app/feedback";
import { addDoc } from "firebase/firestore";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));
jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(async () => ({ id: "t1" })),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => "SERVER_TIME"),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  addDoc.mockClear();
});

describe("Emergency Info screen", () => {
  it("saves cleaned contacts and medical details on the device", async () => {
    await render(<EmergencyInfo />);
    await fireEvent.changeText(screen.getByLabelText("Contact 1 name"), "  Ali   Khan ");
    await fireEvent.changeText(screen.getByLabelText("Contact 1 phone"), "+92 300 1234567");
    await fireEvent.press(screen.getByLabelText("Blood type O+"));
    await fireEvent.changeText(screen.getByLabelText("Allergies"), "Peanuts");
    await fireEvent.press(screen.getByLabelText("Save emergency info"));
    expect(await screen.findByText("Saved on this device")).toBeTruthy();
    expect(await AsyncStorage.getItem("@goguide_emergency_info")).not.toContain("Peanuts"); // encrypted at rest
    const stored = JSON.parse(await secureStorage.getItem("@goguide_emergency_info"));
    expect(stored.contacts[0]).toEqual({ name: "Ali Khan", phone: "+92 300 1234567", relation: "" });
    expect(stored.bloodType).toBe("O+");
    expect(stored.allergies).toBe("Peanuts");
    expect(stored.contacts).toHaveLength(3);
    expect(screen.getByLabelText("Call Ali Khan")).toBeTruthy();
  });

  it("explains a bad phone number and does not save", async () => {
    await render(<EmergencyInfo />);
    await fireEvent.changeText(screen.getByLabelText("Contact 1 name"), "Sara");
    await fireEvent.changeText(screen.getByLabelText("Contact 1 phone"), "12");
    await fireEvent.press(screen.getByLabelText("Save emergency info"));
    expect(await screen.findByText(/phone number does not look right/)).toBeTruthy();
    expect(await AsyncStorage.getItem("@goguide_emergency_info")).toBeNull();
  });

  it("loads what was saved before", async () => {
    await AsyncStorage.setItem("@goguide_emergency_info", JSON.stringify({ contacts: [{ name: "Mum", phone: "+92 300 7654321" }], bloodType: "A-" }));
    await render(<EmergencyInfo />);
    await waitFor(() => expect(screen.getByDisplayValue("Mum")).toBeTruthy());
    expect(screen.getByLabelText("Blood type A-").props.accessibilityState.selected).toBe(true);
  });
});

describe("Feedback screen", () => {
  it("cannot be sent without a star rating", async () => {
    await render(<Feedback />);
    await fireEvent.press(screen.getByLabelText("Send feedback"));
    expect(addDoc).not.toHaveBeenCalled();
  });

  it("sends the rating and comment as a Feedback ticket, then says thank you", async () => {
    await render(<Feedback />);
    await fireEvent.press(screen.getByLabelText("4 stars"));
    expect(screen.getByText("Good")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Your feedback"), "Great planner");
    await fireEvent.press(screen.getByLabelText("Send feedback"));
    expect(await screen.findByText("Thank you!")).toBeTruthy();
    expect(addDoc).toHaveBeenCalledTimes(1);
    const payload = addDoc.mock.calls[0][1];
    expect(payload).toMatchObject({ category: "Feedback", message: "Rating: 4/5\nGreat planner", status: "open", userId: "guest" });
  });

  it("shows a friendly error and lets the user retry when sending fails", async () => {
    addDoc.mockRejectedValueOnce(new Error("offline"));
    await render(<Feedback />);
    await fireEvent.press(screen.getByLabelText("5 stars"));
    await fireEvent.press(screen.getByLabelText("Send feedback"));
    expect(await screen.findByText(/couldn't send that just now/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Send feedback"));
    expect(await screen.findByText("Thank you!")).toBeTruthy();
  });
});
