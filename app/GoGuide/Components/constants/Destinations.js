// Curated nature destinations shown on the Explore screen.
// To add a new category: add it to DESTINATION_CATEGORIES, then add places with that category id.

export const DESTINATION_CATEGORIES = [
  { id: "all", label: "All", icon: "sparkles-outline", title: "Explore Destinations" },
  { id: "cities", label: "Cities", icon: "business-outline", title: "Iconic Cities" },
  { id: "beaches", label: "Beach", icon: "sunny-outline", title: "Beautiful Beaches" },
  { id: "mountains", label: "Mountain", icon: "triangle-outline", title: "Majestic Mountains" },
  { id: "forest", label: "Forest", icon: "leaf-outline", title: "Lush Forests" },
];

export const DESTINATIONS = [
  // Iconic Cities (All verified HD 1200px)
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

  // Beaches (All verified HD 1200px)
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

  // Mountains (All verified HD 1200px)
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

  // Forests (All verified HD 1200px)
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
    title: "Sagano Bamboo Forest, Japan",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
    rating: "4.7",
    liked: false,
    lat: "35.0094",
    lon: "135.6668",
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
  "photo-1493016597980-30510edb8e72": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop", // Sagano Bamboo
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
  if (lower.includes("bali") || lower.includes("indonesia")) {
    return "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("maldives")) {
    return "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("bora bora") || lower.includes("tahiti")) {
    return "https://images.unsplash.com/photo-1533692328991-08159ff19fca?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("maui") || lower.includes("hawaii") || lower.includes("honolulu")) {
    return "https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("phuket") || lower.includes("thailand") || lower.includes("bangkok")) {
    return "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("swiss") || lower.includes("alps") || lower.includes("switzerland") || lower.includes("zurich")) {
    return "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=1200&auto=format&fit=crop";
  }
  if (lower.includes("banff") || lower.includes("canada") || lower.includes("vancouver") || lower.includes("toronto")) {
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
  if (lower.includes("redwood") || lower.includes("california") || lower.includes("san francisco") || lower.includes("los angeles")) {
    return "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop";
  }
  return DEFAULT_HD_TRAVEL_IMAGE;
};
