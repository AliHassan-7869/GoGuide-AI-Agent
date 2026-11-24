import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import Explore from "../app/explore";
import { CreateTripContext } from "../context/CreateTripContext";

let mockParams = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));

const ui = () => (
  <CreateTripContext.Provider value={{ userData: {}, preferences: {}, tripData: {}, setTripData: jest.fn() }}>
    <Explore />
  </CreateTripContext.Provider>
);

describe("Explore follows the ?category= link", () => {
  it("opens on the category in the link", async () => {
    mockParams = { category: "beaches" };
    await render(ui());
    expect(await screen.findByText("Turquoise Beaches & Islands")).toBeTruthy();
  });

  it("defaults to All when there is no (or an unknown) category", async () => {
    mockParams = { category: "banana" };
    await render(ui());
    expect(await screen.findByText("Explore All Destinations")).toBeTruthy();
  });

  it("switches when the link changes to another category", async () => {
    mockParams = { category: "beaches" };
    const view = await render(ui());
    expect(await screen.findByText("Turquoise Beaches & Islands")).toBeTruthy();
    mockParams = { category: "mountains" };
    await view.rerender(ui());
    expect(await screen.findByText("Majestic Mountain Peaks")).toBeTruthy();
  });

  it("ignores an unknown category in a later link and keeps the current one", async () => {
    mockParams = { category: "mountains" };
    const view = await render(ui());
    mockParams = { category: "banana" };
    await view.rerender(ui());
    expect(await screen.findByText("Majestic Mountain Peaks")).toBeTruthy();
  });

  it("still lets the user pick a category with the chips", async () => {
    mockParams = {};
    await render(ui());
    await fireEvent.press((await screen.findAllByText("Forests"))[0]);
    expect(await screen.findByText("Lush Forests & Nature Reserves")).toBeTruthy();
  });
});
