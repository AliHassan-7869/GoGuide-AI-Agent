import React from "react";
import { render, screen } from "@testing-library/react-native";
import FlightLegCard from "../../MyTrips/FlightLegCard";

const props = {
  label: "🛫 GOING • DAY 1 (Nov 14, 2026)",
  flightCode: "Flight EK-613 • 3h 45m",
  route: "Lahore (LHE) ✈️ Dubai (DXB)",
  depTime: "09:15 AM",
  arrTime: "02:35 PM",
  stops: "Non-stop Direct",
  footer: "Departing: Allama Iqbal International Airport",
  accent: "#0A7EA4",
  backgroundColor: "#F8FAFC",
  titleColor: "#0F172A",
  subColor: "#64748B",
};

describe("FlightLegCard", () => {
  it("shows every flight detail", async () => {
    await render(<FlightLegCard {...props} />);
    for (const t of [props.label, props.flightCode, props.route, props.depTime, props.arrTime, props.stops, props.footer]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
  });

  it("copes with very long text and with missing optional parts", async () => {
    await render(
      <FlightLegCard
        {...props}
        flightCode={undefined}
        footer={undefined}
        stops="1 Stop • via Doha (Hamad International Airport) • 2h 10m layover"
        route="Islamabad International Airport (ISB) ✈️ London Heathrow Airport (LHR)"
      />
    );
    expect(screen.getByText(/1 Stop/)).toBeTruthy();
    expect(screen.queryByText("Flight EK-613 • 3h 45m")).toBeNull();
  });
});
