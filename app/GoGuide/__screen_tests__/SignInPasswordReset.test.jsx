import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import SignIn from "../app/auth/sign-in/index";
import { sendPasswordResetEmail } from "firebase/auth";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));
jest.mock("firebase/auth", () => ({
  sendPasswordResetEmail: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));

const EMAIL_PLACEHOLDER = "Enter your email";

describe("Sign-in: Forgot password", () => {
  beforeEach(() => sendPasswordResetEmail.mockReset());

  it("asks for an email first and sends nothing when it is empty", async () => {
    await render(<SignIn />);
    await fireEvent.press(screen.getByLabelText(/Forgot password/));
    expect(await screen.findByText(/Enter your email address above/)).toBeTruthy();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("sends the reset email to the trimmed address and confirms without revealing the account", async () => {
    sendPasswordResetEmail.mockResolvedValue(undefined);
    await render(<SignIn />);
    await fireEvent.changeText(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), "  me@example.com ");
    await fireEvent.press(screen.getByLabelText(/Forgot password/));
    await waitFor(() => expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1));
    expect(sendPasswordResetEmail.mock.calls[0][1]).toBe("me@example.com");
    expect(await screen.findByText(/If an account exists for that email/)).toBeTruthy();
  });

  it("shows the same confirmation when the account does not exist", async () => {
    sendPasswordResetEmail.mockRejectedValue({ code: "auth/user-not-found" });
    await render(<SignIn />);
    await fireEvent.changeText(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), "ghost@example.com");
    await fireEvent.press(screen.getByLabelText(/Forgot password/));
    expect(await screen.findByText(/If an account exists for that email/)).toBeTruthy();
  });

  it("reports a real failure such as no connection", async () => {
    sendPasswordResetEmail.mockRejectedValue({ code: "auth/network-request-failed" });
    await render(<SignIn />);
    await fireEvent.changeText(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), "me@example.com");
    await fireEvent.press(screen.getByLabelText(/Forgot password/));
    expect(await screen.findByText(/Could not connect/)).toBeTruthy();
  });
});
