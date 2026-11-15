import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen } from "@testing-library/react-native";
import Favourites from "../app/favourites";
import { CreateTripContext } from "../context/CreateTripContext";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  Stack: { Screen: () => null },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(), query: jest.fn(), where: jest.fn(), getDocs: jest.fn(async () => ({ empty: true, forEach: () => {} })),
  setDoc: jest.fn(), deleteDoc: jest.fn(), doc: jest.fn(),
}));
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(), selectionAsync: jest.fn(), ImpactFeedbackStyle: {} }));

const renderPage = () =>
  render(
    <CreateTripContext.Provider value={{ setTripData: jest.fn() }}>
      <Favourites />
    </CreateTripContext.Provider>
  );

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("Favourites page", () => {
  it("shows the empty state when nothing is saved", async () => {
    await renderPage();
    expect(await screen.findByText("No Favourites Yet")).toBeTruthy();
  });

  it("shows every saved place and survives broken data (bad image, object rating, duplicate)", async () => {
    await AsyncStorage.setItem(
      "@goguide_favorites",
      JSON.stringify([
        { id: "a", name: "Tokyo, Japan", image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26", category: "cities", rating: "4.9" },
        { id: "b", name: "Odd Hotel", image: { not: "a link" }, category: { weird: true }, rating: { value: 5 } },
        { id: "c", name: "Plain Http Place", image: "http://example.com/pic.jpg", category: "hotel • dubai", rating: 4.2 },
        { id: "fav_user_Tokyo", name: "tokyo, japan", image: "https://images.unsplash.com/x" },
        null,
        "junk",
      ])
    );
    await renderPage();
    expect(await screen.findByText("Tokyo, Japan")).toBeTruthy();
    expect(screen.getByText("Odd Hotel")).toBeTruthy();
    expect(screen.getByText("Plain Http Place")).toBeTruthy();
    expect(screen.getAllByText("Tokyo, Japan")).toHaveLength(1); // duplicate removed
    expect(screen.getByText("Hotel • Dubai")).toBeTruthy(); // tidy label
    expect(screen.getAllByLabelText(/Remove .* from favourites/)).toHaveLength(3);
  });
});
