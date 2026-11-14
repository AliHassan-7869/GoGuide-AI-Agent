import React from "react";
import { render, screen } from "@testing-library/react-native";
import VerifiedTag from "../VerifiedTag";

describe("VerifiedTag", () => {
  it("shows the label and is readable by screen readers", async () => {
    await render(<VerifiedTag />);
    expect(screen.getByText("Verified on map")).toBeTruthy();
    expect(screen.getByLabelText("Place verified on the map")).toBeTruthy();
  });
});
