import { normalizeTripPlan } from "../Components/utils/PdfDownloadService";

describe("PDF export does not invent trip content", () => {
  it("leaves the itinerary empty when the trip has none (the caller then reports it)", () => {
    const data = normalizeTripPlan({ destination: "Rome, Italy", hotels: [], itinerary: [] }, "Rome");
    expect(data.itinerary).toEqual([]);
    expect(JSON.stringify(data)).not.toMatch(/Heritage Museum|Sky Deck|Traditional Regional Bistro/);
  });

  it("does not add a made-up hotel when the trip has no hotels", () => {
    const data = normalizeTripPlan({ destination: "Rome, Italy", itinerary: [{ day: 1, activities: [{ placeName: "Colosseum" }] }] }, "Rome");
    expect(data.hotels).toEqual([]);
    expect(JSON.stringify(data)).not.toMatch(/Grand .* Suites|\$110\/night/);
  });

  it("keeps real hotel data and does not add a rating, price or address that was not there", () => {
    const data = normalizeTripPlan(
      { destination: "Rome", hotels: [{ name: "Casa" }], itinerary: [{ day: 1, activities: [{ placeName: "Colosseum" }] }] },
      "Rome"
    );
    expect(data.hotels[0].name).toBe("Casa");
    expect(data.hotels[0].rating).toBe("");
    expect(data.hotels[0].price).toBe("Price not listed");
    expect(data.hotels[0].address).toBe("");
  });
});
