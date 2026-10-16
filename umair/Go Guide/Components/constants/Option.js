export const SelectTravelerList = [
  {
    id: 1,
    title: "Just me",
    description: "I sole travelers in exploration",
    icon: "🌄",
    people: "1",
  },
  {
    id: 2,
    title: " A Couple",
    description: "I travel with my partner",
    icon: "🏠",
    people: "2 People",
  },
  {
    id: 3,
    title: "Family",
    description: "I travel with family",
    icon: "❄️",
    people: "3 to 5 People",
  },
  {
    id: 4,
    title: "Friends",
    description: "I travel with friends",
    icon: "🗻",
    people: "2 to 5 People",
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


export const INTEREST_PROMPT = 'Analyze the travel destination: {{location}}. Generate a highly specific real-time response in JSON format containing two arrays: "interests" and "transports". \n\n1. "interests": 15 points of interest/activities unique to {{location}}. (e.g., if Hunza, focus on peaks, lakes, and trekking; if Lahore, focus on historical sites, street food, and museums). Each: {"id": "string", "name": "emoji + name", "description": "1 short hook", "category": "category"}.\n\n2. "transports": 5 best ways to travel within or around {{location}}. (e.g., for mountains: "4x4 Jeep", "Local Van"; for big cities: "Auto Rickshaw", "Metro Train"). Each: {"id": "string", "name": "emoji + name"}. \n\nCrucial: Ensure no generic suggestions. Data must be 100% specific to the geography of {{location}}.'

export const DEFAULT_INTERESTS = [
  { id: '1', name: '🏙️ City Center', description: 'Explore the heart of the city', category: 'General' },
  { id: '2', name: '🍴 Local Street Food', description: 'Taste authentic local flavors', category: 'Food' },
  { id: '3', name: '🏛️ Historical Landmark', description: 'Visit must-see historical sites', category: 'History' },
  { id: '4', name: '🌳 Public Park', description: 'Relax in the most popular green space', category: 'Leisure' },
  { id: '5', name: '🛍️ Shopping District', description: 'Best local shopping experience', category: 'Shopping' },
];

export const DEFAULT_TRANSPORTS = [
  { id: '1', name: '🚕 Local Taxi' },
  { id: '2', name: '🚌 Public Bus' },
  { id: '3', name: '🚶 Walking' },
  { id: '4', name: '🚲 Cycle Rental' },
  { id: '5', name: '🚇 Metro/Train' },
];
