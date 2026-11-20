import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveTripToBookings, addHotelBooking, addActivityBooking } from "../Components/utils/BookingService";

jest.mock("firebase/firestore", () => ({ addDoc: jest.fn(async () => ({ id: "doc1" })), collection: jest.fn() }));

const baseTrip = {
  startDate: "2030-05-01",
  endDate: "2030-05-04",
  totalNoOfDays: 3,
  budget: "Moderate",
  toLocation: { name: "Rome, Italy", coordinates: { lat: 41.9, lng: 12.5 } },
  fromLocation: { name: "Lahore, Pakistan" },
};
const tripWithHotel = { ...baseTrip, aiTripPlan: { destination: "Rome, Italy", hotels: [{ name: "Hotel Roma", address: "Via 1", price: "$150 per night" }], itinerary: [{ day: 1 }] } };
const tripNoHotel = { ...baseTrip, aiTripPlan: { destination: "Rome, Italy", hotels: [], itinerary: [{ day: 1 }] } };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(Math, "random");
});
afterEach(() => jest.restoreAllMocks());

describe("My Bookings entries are honest plans", () => {
  it("never uses random numbers for references, and labels them as plans", async () => {
    const res = await saveTripToBookings(tripWithHotel, null);
    expect(Math.random).not.toHaveBeenCalled();
    expect(res.hotelBooking.bookingRef).toMatch(/^PLAN-H-[0-9A-F]{6}$/);
    expect(res.flightBooking.bookingRef).toMatch(/^PLAN-F-[0-9A-F]{6}$/);
  });

  it("saving the same trip twice gives the same references", async () => {
    const a = await saveTripToBookings(tripWithHotel, null);
    const b = await saveTripToBookings(tripWithHotel, null);
    expect(b.hotelBooking.bookingRef).toBe(a.hotelBooking.bookingRef);
    expect(b.flightBooking.bookingRef).toBe(a.flightBooking.bookingRef);
  });

  it("does not invent a hotel, a hotel price or check-in times when the trip has no hotel", async () => {
    const res = await saveTripToBookings(tripNoHotel, null);
    expect(res.hotelBooking).toBeNull();
    const stored = JSON.parse(await AsyncStorage.getItem("@goguide_user_bookings"));
    expect(stored.some((b) => b.type === "Hotels")).toBe(false);
    const text = JSON.stringify(stored);
    expect(text).not.toMatch(/Grand Boutique|\$120\/night/);
    expect(res.bookingsCount).toBe(1);
  });

  it("keeps the real hotel's name and price, and shows dates without invented clock times", async () => {
    const res = await saveTripToBookings(tripWithHotel, null);
    expect(res.hotelBooking.title).toBe("Hotel Roma");
    expect(res.hotelBooking.price).toBe("$150 per night");
    expect(res.hotelBooking.checkIn).not.toMatch(/PM|AM/);
    expect(res.hotelBooking.checkOut).not.toMatch(/PM|AM/);
  });

  it("shows 'not listed' rather than a made-up price", async () => {
    const hotel = await addHotelBooking({ name: "Casa" }, "Rome", baseTrip, null);
    expect(hotel.price).toBe("Price not listed");
    expect(hotel.bookingRef).toMatch(/^PLAN-H-/);
  });

  it("activity references are deterministic plan references too", async () => {
    const a1 = await addActivityBooking({ placeName: "Colosseum" }, 1, "Rome", baseTrip, null);
    const a2 = await addActivityBooking({ placeName: "Colosseum" }, 1, "Rome", baseTrip, null);
    expect(a1.bookingRef).toMatch(/^PLAN-A-[0-9A-F]{6}$/);
    expect(a2.bookingRef).toBe(a1.bookingRef);
    expect(Math.random).not.toHaveBeenCalled();
  });
});
