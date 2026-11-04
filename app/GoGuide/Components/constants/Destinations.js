// Curated nature & global destinations shown on Explore & Discover screens.
// To add a new category: add it to DESTINATION_CATEGORIES, then add places with that category id.

export const DESTINATION_CATEGORIES = [
  { id: "all", label: "All", icon: "sparkles-outline", title: "Explore All Destinations" },
  { id: "cities", label: "Cities", icon: "business-outline", title: "Iconic Global Cities" },
  { id: "beaches", label: "Beaches", icon: "sunny-outline", title: "Turquoise Beaches & Islands" },
  { id: "mountains", label: "Mountains", icon: "triangle-outline", title: "Majestic Mountain Peaks" },
  { id: "forest", label: "Forests", icon: "leaf-outline", title: "Lush Forests & Nature Reserves" },
  { id: "camping", label: "Camping", icon: "bonfire-outline", title: "Wild Campings & Glamping Pods" },
];

export const DESTINATIONS = [
  // ==========================================
  // 1. Iconic Global Cities (Verified HD 1200px)
  // ==========================================
  {
    id: "city-1",
    category: "cities",
    title: "Tokyo, Japan",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "35.6764",
    lon: "139.6500",
  },
  {
    id: "city-2",
    category: "cities",
    title: "Paris, France",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "48.8566",
    lon: "2.3522",
  },
  {
    id: "city-3",
    category: "cities",
    title: "New York, USA",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: true,
    lat: "40.7128",
    lon: "-74.0060",
  },
  {
    id: "city-4",
    category: "cities",
    title: "Dubai, United Arab Emirates",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "25.2048",
    lon: "55.2708",
  },
  {
    id: "city-5",
    category: "cities",
    title: "Rome, Italy",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: true,
    lat: "41.9028",
    lon: "12.4964",
  },
  {
    id: "city-6",
    category: "cities",
    title: "London, United Kingdom",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: false,
    lat: "51.5074",
    lon: "-0.1278",
  },
  {
    id: "city-7",
    category: "cities",
    title: "Singapore",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "1.3521",
    lon: "103.8198",
  },
  {
    id: "city-8",
    category: "cities",
    title: "Istanbul, Turkey",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: false,
    lat: "41.0082",
    lon: "28.9784",
  },
  {
    id: "city-9",
    category: "cities",
    title: "Barcelona, Spain",
    image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "41.3879",
    lon: "2.1699",
  },
  {
    id: "city-10",
    category: "cities",
    title: "Bangkok, Thailand",
    image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: false,
    lat: "13.7563",
    lon: "100.5018",
  },
  {
    id: "city-11",
    category: "cities",
    title: "Sydney, Australia",
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "-33.8688",
    lon: "151.2093",
  },
  {
    id: "city-12",
    category: "cities",
    title: "Cape Town, South Africa",
    image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: false,
    lat: "-33.9249",
    lon: "18.4241",
  },

  // ==========================================
  // 2. Turquoise Beaches & Islands (Verified HD 1200px)
  // ==========================================
  {
    id: "beach-1",
    category: "beaches",
    title: "Maldives",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1200&auto=format&fit=crop",
    rating: "5.0",
    liked: true,
    lat: "3.2028",
    lon: "73.2207",
  },
  {
    id: "beach-2",
    category: "beaches",
    title: "Bora Bora",
    image: "https://images.unsplash.com/photo-1533692328991-08159ff19fca?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "-16.5004",
    lon: "-151.7415",
  },
  {
    id: "beach-3",
    category: "beaches",
    title: "Maui, Hawaii",
    image: "https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: true,
    lat: "20.7984",
    lon: "-156.3319",
  },
  {
    id: "beach-4",
    category: "beaches",
    title: "Phuket, Thailand",
    image: "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?q=80&w=1200&auto=format&fit=crop",
    rating: "4.7",
    liked: false,
    lat: "7.8804",
    lon: "98.3923",
  },
  {
    id: "beach-5",
    category: "beaches",
    title: "Bali, Indonesia",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "-8.4095",
    lon: "115.1889",
  },
  {
    id: "beach-6",
    category: "beaches",
    title: "Santorini, Greece",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop",
    rating: "5.0",
    liked: true,
    lat: "36.3932",
    lon: "25.4615",
  },
  {
    id: "beach-7",
    category: "beaches",
    title: "Amalfi Coast, Italy",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "40.6333",
    lon: "14.6029",
  },
  {
    id: "beach-8",
    category: "beaches",
    title: "Zanzibar, Tanzania",
    image: "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: true,
    lat: "-6.1659",
    lon: "39.2026",
  },
  {
    id: "beach-9",
    category: "beaches",
    title: "Tulum, Mexico",
    image: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: false,
    lat: "20.2114",
    lon: "-87.4654",
  },
  {
    id: "beach-10",
    category: "beaches",
    title: "Navagio Beach, Zakynthos",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "37.8594",
    lon: "20.6249",
  },

  // ==========================================
  // 3. Majestic Mountains (Verified HD 1200px)
  // ==========================================
  {
    id: "mountain-1",
    category: "mountains",
    title: "Swiss Alps, Switzerland",
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1200&auto=format&fit=crop",
    rating: "5.0",
    liked: true,
    lat: "46.5595",
    lon: "8.5599",
  },
  {
    id: "mountain-2",
    category: "mountains",
    title: "Banff National Park, Canada",
    image: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "51.4968",
    lon: "-115.9281",
  },
  {
    id: "mountain-3",
    category: "mountains",
    title: "Mount Fuji, Japan",
    image: "https://images.unsplash.com/photo-1578637387939-43c525550085?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: true,
    lat: "35.3606",
    lon: "138.7274",
  },
  {
    id: "mountain-4",
    category: "mountains",
    title: "Patagonia, Chile",
    image: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "-50.9423",
    lon: "-73.4068",
  },
  {
    id: "mountain-5",
    category: "mountains",
    title: "Karakoram & Hunza Valley, Pakistan",
    image: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=1200&auto=format&fit=crop",
    rating: "5.0",
    liked: true,
    lat: "36.3167",
    lon: "74.6500",
  },
  {
    id: "mountain-6",
    category: "mountains",
    title: "Dolomites, Italy",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "46.4102",
    lon: "11.8440",
  },
  {
    id: "mountain-7",
    category: "mountains",
    title: "Queenstown, New Zealand",
    image: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "-45.0312",
    lon: "168.6626",
  },
  {
    id: "mountain-8",
    category: "mountains",
    title: "Mount Kilimanjaro, Tanzania",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: true,
    lat: "-3.0674",
    lon: "37.3556",
  },
  {
    id: "mountain-9",
    category: "mountains",
    title: "Yosemite National Park, USA",
    image: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "37.8651",
    lon: "-119.5383",
  },

  // ==========================================
  // 4. Lush Forests & Nature (Verified HD 1200px)
  // ==========================================
  {
    id: "forest-1",
    category: "forest",
    title: "Amazon Rainforest, Brazil",
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "-3.4653",
    lon: "-62.2159",
  },
  {
    id: "forest-2",
    category: "forest",
    title: "Black Forest, Germany",
    image: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: false,
    lat: "48.3333",
    lon: "8.3333",
  },
  {
    id: "forest-3",
    category: "forest",
    title: "Redwood National Park, USA",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "41.2132",
    lon: "-124.0046",
  },
  {
    id: "forest-4",
    category: "forest",
    title: "Arashiyama Bamboo Grove, Japan",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "35.0167",
    lon: "135.6713",
  },
  {
    id: "forest-5",
    category: "forest",
    title: "Monteverde Cloud Forest, Costa Rica",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "10.3023",
    lon: "-84.7957",
  },
  {
    id: "forest-6",
    category: "forest",
    title: "Jiuzhaigou National Park, China",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: true,
    lat: "33.2600",
    lon: "103.9186",
  },
  {
    id: "forest-7",
    category: "forest",
    title: "Hallerbos Bluebell Forest, Belgium",
    image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: false,
    lat: "50.7092",
    lon: "4.2882",
  },

  // ==========================================
  // 5. Wild Campings & Glamping (NEW Verified HD 1200px)
  // ==========================================
  {
    id: "camping-1",
    category: "camping",
    title: "Merzouga Luxury Desert Camp, Morocco",
    image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: true,
    lat: "31.0802",
    lon: "-4.0133",
  },
  {
    id: "camping-2",
    category: "camping",
    title: "Lake Louise Alpine Campsite, Canada",
    image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=1200&auto=format&fit=crop",
    rating: "5.0",
    liked: true,
    lat: "51.4254",
    lon: "-116.1773",
  },
  {
    id: "camping-3",
    category: "camping",
    title: "Wadi Rum Martian Glamping, Jordan",
    image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "29.5734",
    lon: "35.4333",
  },
  {
    id: "camping-4",
    category: "camping",
    title: "Yellowstone Wilderness Campsite, USA",
    image: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=1200&auto=format&fit=crop",
    rating: "4.8",
    liked: true,
    lat: "44.4280",
    lon: "-110.5885",
  },
  {
    id: "camping-5",
    category: "camping",
    title: "Fairy Meadows Basecamp, Pakistan",
    image: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?q=80&w=1200&auto=format&fit=crop",
    rating: "5.0",
    liked: true,
    lat: "35.3853",
    lon: "74.5806",
  },
  {
    id: "camping-6",
    category: "camping",
    title: "Salar de Uyuni Salt Flats Camp, Bolivia",
    image: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=1200&auto=format&fit=crop",
    rating: "4.9",
    liked: false,
    lat: "-20.1338",
    lon: "-67.4891",
  },
];

// Replacement map for known deprecated / broken Unsplash IDs to verified HD images
const REPLACEMENT_MAP = {
  "photo-1502602898657-3e907fa0a586": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop", // Paris
  "photo-1589394815804-964ce0fc5d13": "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?q=80&w=1200&auto=format&fit=crop", // Phuket
  "photo-1549884614-7e8c3d9a16f9": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?q=80&w=1200&auto=format&fit=crop", // Banff
  "photo-1498698963570-36e382618828": "https://images.unsplash.com/photo-1578637387939-43c525550085?q=80&w=1200&auto=format&fit=crop", // Mount Fuji
  "photo-1473445730015-841f29a949ce": "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=1200&auto=format&fit=crop", // Patagonia
  "photo-1502421319084-3c6628dfca51": "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop", // Redwood
  "photo-1493016597980-30510edb8e72": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop", // Bamboo
};

export const DEFAULT_HD_TRAVEL_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop";

export const sanitizeImageUrl = (url, fallback = DEFAULT_HD_TRAVEL_IMAGE) => {
  if (!url || typeof url !== "string") return fallback;
  for (const [brokenId, fixedUrl] of Object.entries(REPLACEMENT_MAP)) {
    if (url.includes(brokenId)) {
      return fixedUrl;
    }
  }
  // If it is an Unsplash image, upgrade resolution to HD (1200px)
  if (url.includes("images.unsplash.com") && !url.includes("w=1200")) {
    return url.replace(/w=\d+/, "w=1200");
  }
  return url;
};

export const getDestinationImage = (destinationName) => {
  if (!destinationName || typeof destinationName !== "string") {
    return DEFAULT_HD_TRAVEL_IMAGE;
  }
  const lower = destinationName.toLowerCase();
  if (lower.includes("paris") || lower.includes("france")) {
    return "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("tokyo") || lower.includes("japan") || lower.includes("kyoto")) {
    return "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("york") || lower.includes("nyc") || lower.includes("manhattan")) {
    return "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("dubai") || lower.includes("emirates") || lower.includes("uae")) {
    return "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("rome") || lower.includes("italy") || lower.includes("venice") || lower.includes("florence")) {
    return "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("london") || lower.includes("uk") || lower.includes("britain") || lower.includes("england")) {
    return "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("singapore")) {
    return "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("istanbul") || lower.includes("turkey") || lower.includes("turkiye")) {
    return "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("barcelona") || lower.includes("spain") || lower.includes("madrid")) {
    return "https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("bangkok") || lower.includes("thailand") || lower.includes("phuket")) {
    return "https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("sydney") || lower.includes("australia") || lower.includes("melbourne")) {
    return "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("cape town") || lower.includes("south africa")) {
    return "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("bali") || lower.includes("indonesia")) {
    return "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("maldives")) {
    return "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("santorini") || lower.includes("greece") || lower.includes("athens") || lower.includes("mykonos")) {
    return "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("amalfi") || lower.includes("positano")) {
    return "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("zanzibar") || lower.includes("tanzania")) {
    return "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("tulum") || lower.includes("cancun") || lower.includes("mexico")) {
    return "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("bora bora") || lower.includes("tahiti")) {
    return "https://images.unsplash.com/photo-1533692328991-08159ff19fca?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("maui") || lower.includes("hawaii") || lower.includes("honolulu")) {
    return "https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("hunza") || lower.includes("karakoram") || lower.includes("pakistan") || lower.includes("skardu") || lower.includes("fairy meadows")) {
    return "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("dolomites")) {
    return "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("queenstown") || lower.includes("zealand")) {
    return "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("kilimanjaro")) {
    return "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("yosemite")) {
    return "https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("swiss") || lower.includes("alps") || lower.includes("switzerland") || lower.includes("zurich")) {
    return "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("banff") || lower.includes("canada") || lower.includes("vancouver") || lower.includes("toronto") || lower.includes("lake louise")) {
    return "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("fuji")) {
    return "https://images.unsplash.com/photo-1578637387939-43c525550085?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("patagonia") || lower.includes("chile") || lower.includes("argentina")) {
    return "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("amazon") || lower.includes("brazil")) {
    return "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("black forest") || lower.includes("germany") || lower.includes("berlin") || lower.includes("munich")) {
    return "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("bamboo") || lower.includes("arashiyama")) {
    return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("monteverde") || lower.includes("costa rica")) {
    return "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("jiuzhaigou") || lower.includes("china")) {
    return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("merzouga") || lower.includes("sahara") || lower.includes("morocco")) {
    return "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("wadi rum") || lower.includes("jordan") || lower.includes("petra")) {
    return "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("yellowstone")) {
    return "https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("uyuni") || lower.includes("bolivia")) {
    return "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=1200&auto=format&fit=crop";
  }
  return DEFAULT_HD_TRAVEL_IMAGE;
};
