import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import EmptyState from "../EmptyState";
import ScreenHeader from "../ScreenHeader";
import { TouchableOpacity } from "../Touchable";
import { Text } from "react-native";

jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("EmptyState", () => {
  it("shows title, text and fires the primary action", async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="No trips yet" text="Plan your first trip" actionLabel="Plan a trip" onAction={onAction} />);
    expect(screen.getByText("No trips yet")).toBeTruthy();
    expect(screen.getByText("Plan your first trip")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Plan a trip"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("hides the action button when no handler is given", async () => {
    await render(<EmptyState title="Offline" actionLabel="Try again" />);
    expect(screen.queryByLabelText("Try again")).toBeNull();
  });
});

describe("ScreenHeader", () => {
  it("renders the title and subtitle", async () => {
    await render(<ScreenHeader title="My Bookings" subtitle="All vouchers" />);
    expect(screen.getByText("My Bookings")).toBeTruthy();
    expect(screen.getByText("All vouchers")).toBeTruthy();
  });

  it("calls the custom back handler", async () => {
    const onBack = jest.fn();
    await render(<ScreenHeader title="Trip" onBack={onBack} />);
    const back = screen.getAllByRole("button")[0];
    await fireEvent.press(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("Touchable", () => {
  it("is a button by default and ignores a second tap while an async press is running", async () => {
    let resolve;
    const onPress = jest.fn(() => new Promise((r) => { resolve = r; }));
    await render(
      <TouchableOpacity accessibilityLabel="Save" onPress={onPress}>
        <Text>Save</Text>
      </TouchableOpacity>
    );
    const btn = screen.getByRole("button");
    await fireEvent.press(btn);
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
    resolve();
    await Promise.resolve();
    await Promise.resolve();
    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});
