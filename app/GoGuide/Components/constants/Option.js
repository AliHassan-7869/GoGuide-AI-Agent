export const SelectTravelerList = [
  {
    id: 1,
    title: "Solo",
    description: "Solo traveler exploring the world",
    icon: "🧳",
    people: "1 Person",
  },
  {
    id: 2,
    title: "Couple",
    description: "Traveling as a pair with my partner",
    icon: "💑",
    people: "2 People",
  },
  {
    id: 3,
    title: "Family",
    description: "Fun adventures with the whole family",
    icon: "👨‍👩‍👧",
    people: "3 to 5 People",
  },
  {
    id: 4,
    title: "Friends",
    description: "Group getaway with close friends",
    icon: "🧑‍🤝‍🧑",
    people: "2 to 5+ People",
  },
];

export const AI_PROMPT = `Generate a comprehensive Travel Plan from {{fromLocation}} to {{toLocation}} for {{totalDays}} days and {{totalNight}} nights for a {{traveler}} with a {{budget}} budget. 

Return the response ONLY in JSON format following this exact schema:
{
  "trip": {
    "destination": "string",
    "duration": "string",
    "traveler": "string",
    "budget": "string",
    "weatherBrief": "string (short description of likely weather)",
    "packingList": [
      { "item": "string", "category": "Clothing/Electronics/Essentials/Extra" }
    ],
    "flights": {
      "details": "string",
      "price": "string",
      "bookingUrl": "string"
    },
    "hotels": [
      {
        "name": "string",
        "details": "string",
        "price": "string",
        "coordinates": {"lat": number, "lng": number},
        "rating": "string"
      }
    ],
    "itinerary": [
      {
        "day": number,
        "theme": "string",
        "activities": [
          {
            "time": "string",
            "placeName": "string",
            "details": "string",
            "tickets": "string",
            "coordinates": {"lat": number, "lng": number}
          }
        ]
      }
    ]
  }
}`;


export const DEFAULT_INTERESTS = [
  { id: '1', name: '🏛️ Iconic Historical Landmark', description: 'Explore ancient heritage, palaces & museums', category: 'History' },
  { id: '2', name: '🍴 Local Food & Culinary Tour', description: 'Taste legendary local street food and bistros', category: 'Food' },
  { id: '3', name: '⛰️ Scenic Nature & Landscapes', description: 'Hike through natural trails, parks & peaks', category: 'Nature' },
  { id: '4', name: '🏖️ Coastal Waterfront & Beaches', description: 'Relax by picturesque waters and seaside promenades', category: 'Beaches' },
  { id: '5', name: '🛍️ Vibrant Local Bazaars', description: 'Shop for authentic crafts, fashion & souvenirs', category: 'Shopping' },
  { id: '6', name: '👀 Panoramic City Viewpoint', description: 'Enjoy breathtaking 360-degree aerial views', category: 'Viewpoint' },
];

export const DEFAULT_TRANSPORTS = [
  { id: '1', name: '🚕 Local Taxi' },
  { id: '2', name: '🚌 Public Bus' },
  { id: '3', name: '🚶 Walking' },
  { id: '4', name: '🚲 Cycle Rental' },
  { id: '5', name: '🚇 Metro/Train' },
];
