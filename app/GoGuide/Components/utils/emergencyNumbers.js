// Emergency numbers by destination country. Pure module (unit-tested).
// Only widely published national numbers are listed. For any destination not listed we say so and show
// the international number instead of guessing (or showing another country's number).

export const INTERNATIONAL_NUMBER = "112";

const all = (n) => ({ police: n, ambulance: n, fire: n });

const COUNTRIES = {
  pakistan: { label: "Pakistan", police: "15", ambulance: "1122", fire: "16", aliases: ["pakistan"], cities: ["lahore", "karachi", "islamabad", "rawalpindi", "peshawar", "hunza", "skardu"] },
  uae: { label: "United Arab Emirates", police: "999", ambulance: "998", fire: "997", aliases: ["uae", "united arab emirates"], cities: ["dubai", "abu dhabi", "sharjah"] },
  uk: { label: "United Kingdom", ...all("999"), aliases: ["uk", "united kingdom", "great britain", "england", "scotland", "wales", "northern ireland"], cities: ["london", "edinburgh", "manchester"] },
  usa: { label: "United States", ...all("911"), aliases: ["usa", "us", "u.s.", "u.s.a.", "united states", "united states of america", "america"], cities: ["new york", "los angeles", "san francisco", "las vegas", "miami", "chicago"] },
  canada: { label: "Canada", ...all("911"), aliases: ["canada"], cities: ["toronto", "vancouver", "montreal"] },
  japan: { label: "Japan", police: "110", ambulance: "119", fire: "119", aliases: ["japan"], cities: ["tokyo", "kyoto", "osaka", "hiroshima", "sapporo"] },
  turkey: { label: "Türkiye (Turkey)", ...all("112"), aliases: ["turkey", "turkiye"], cities: ["istanbul", "ankara", "antalya", "cappadocia", "izmir"] },
  france: { label: "France", police: "17", ambulance: "15", fire: "18", aliases: ["france"], cities: ["paris", "nice", "lyon", "marseille"] },
  italy: { label: "Italy", ...all("112"), aliases: ["italy"], cities: ["rome", "venice", "florence", "milan", "naples"] },
  spain: { label: "Spain", ...all("112"), aliases: ["spain"], cities: ["madrid", "barcelona", "seville", "valencia"] },
  germany: { label: "Germany", police: "110", ambulance: "112", fire: "112", aliases: ["germany"], cities: ["berlin", "munich", "frankfurt", "hamburg"] },
  netherlands: { label: "Netherlands", ...all("112"), aliases: ["netherlands", "the netherlands", "holland"], cities: ["amsterdam", "rotterdam"] },
  switzerland: { label: "Switzerland", police: "117", ambulance: "144", fire: "118", aliases: ["switzerland"], cities: ["zurich", "geneva", "lucerne", "interlaken"] },
  austria: { label: "Austria", police: "133", ambulance: "144", fire: "122", aliases: ["austria"], cities: ["vienna", "salzburg"] },
  portugal: { label: "Portugal", ...all("112"), aliases: ["portugal"], cities: ["lisbon", "porto"] },
  greece: { label: "Greece", police: "100", ambulance: "166", fire: "199", aliases: ["greece"], cities: ["athens", "santorini", "mykonos"] },
  thailand: { label: "Thailand", police: "191", ambulance: "1669", fire: "199", aliases: ["thailand"], cities: ["bangkok", "phuket", "chiang mai", "pattaya"] },
  indonesia: { label: "Indonesia", police: "110", ambulance: "118", fire: "113", aliases: ["indonesia"], cities: ["bali", "jakarta", "ubud"] },
  malaysia: { label: "Malaysia", ...all("999"), aliases: ["malaysia"], cities: ["kuala lumpur", "penang", "langkawi"] },
  singapore: { label: "Singapore", police: "999", ambulance: "995", fire: "995", aliases: ["singapore"], cities: [] },
  india: { label: "India", ...all("112"), aliases: ["india"], cities: ["delhi", "new delhi", "mumbai", "goa", "jaipur", "agra"] },
  australia: { label: "Australia", ...all("000"), aliases: ["australia"], cities: ["sydney", "melbourne", "brisbane"] },
  newzealand: { label: "New Zealand", ...all("111"), aliases: ["new zealand"], cities: ["auckland", "queenstown", "wellington"] },
  saudi: { label: "Saudi Arabia", police: "999", ambulance: "997", fire: "998", aliases: ["saudi arabia", "ksa"], cities: ["riyadh", "jeddah", "mecca", "makkah", "medina", "madinah"] },
  qatar: { label: "Qatar", ...all("999"), aliases: ["qatar"], cities: ["doha"] },
  egypt: { label: "Egypt", police: "122", ambulance: "123", fire: "180", aliases: ["egypt"], cities: ["cairo", "luxor", "sharm el sheikh"] },
  morocco: { label: "Morocco", police: "19", ambulance: "15", fire: "15", aliases: ["morocco"], cities: ["marrakech", "casablanca"] },
  mexico: { label: "Mexico", ...all("911"), aliases: ["mexico"], cities: ["cancun", "mexico city", "tulum"] },
  china: { label: "China", police: "110", ambulance: "120", fire: "119", aliases: ["china"], cities: ["beijing", "shanghai"] },
  southkorea: { label: "South Korea", police: "112", ambulance: "119", fire: "119", aliases: ["south korea", "korea", "republic of korea"], cities: ["seoul", "busan"] },
  vietnam: { label: "Vietnam", police: "113", ambulance: "115", fire: "114", aliases: ["vietnam", "viet nam"], cities: ["hanoi", "ho chi minh city", "da nang"] },
  srilanka: { label: "Sri Lanka", police: "119", ambulance: "1990", fire: "110", aliases: ["sri lanka"], cities: ["colombo", "kandy"] },
};

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const ALIAS_TO_KEY = {};
const CITY_TO_KEY = {};
for (const [key, c] of Object.entries(COUNTRIES)) {
  c.aliases.forEach((a) => (ALIAS_TO_KEY[norm(a)] = key));
  c.cities.forEach((city) => (CITY_TO_KEY[norm(city)] = key));
}

/** "Kyoto, Japan" / "Dubai" / "New York, NY, USA" -> country key, or null when we cannot tell. */
export function countryKeyFor(destination) {
  const parts = String(destination ?? "").split(",").map(norm).filter(Boolean);
  if (!parts.length) return null;
  for (let i = parts.length - 1; i >= 0; i--) if (ALIAS_TO_KEY[parts[i]]) return ALIAS_TO_KEY[parts[i]];
  for (const p of parts) if (CITY_TO_KEY[p]) return CITY_TO_KEY[p];
  return null;
}

/** What the Safety screen shows: grouped numbers, whether they are verified for this country, and a plain note. */
export function buildEmergencyContacts(destination) {
  const key = countryKeyFor(destination);
  if (!key) {
    return {
      known: false,
      countryKey: null,
      label: null,
      contacts: [{ key: "international", title: "International emergency number", number: INTERNATIONAL_NUMBER }],
      note: "We don't have verified numbers for this destination. 112 connects to local emergency services on most mobile networks worldwide; please confirm the local number when you arrive.",
    };
  }
  const c = COUNTRIES[key];
  const contacts = [];
  if (c.police === c.ambulance && c.ambulance === c.fire) {
    contacts.push({ key: "all", title: "Emergency (police, ambulance, fire)", number: c.police });
  } else {
    contacts.push({ key: "police", title: "Police", number: c.police });
    if (c.ambulance === c.fire) {
      contacts.push({ key: "ambulance-fire", title: "Ambulance / Fire", number: c.ambulance });
    } else {
      contacts.push({ key: "ambulance", title: "Ambulance / Medical", number: c.ambulance });
      contacts.push({ key: "fire", title: "Fire Department", number: c.fire });
    }
  }
  return {
    known: true,
    countryKey: key,
    label: c.label,
    contacts,
    note: `Numbers for ${c.label}. Please confirm locally on arrival, as services can vary by region.`,
  };
}
