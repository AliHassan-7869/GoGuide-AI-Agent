import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Colors } from "../../Components/constants/constants";
import { Radius, Spacing, Typography, useTheme, Palette } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import EmptyState from "../../Components/ui/EmptyState";
import FadeInView from "../../Components/ui/FadeInView";
import ScreenHeader from "../../Components/ui/ScreenHeader";
import { Skeleton } from "../../Components/ui/Skeleton";
import { TouchableOpacity } from "../../Components/ui/Touchable";
import { selectHaptic, tapHaptic } from "../../Components/utils/haptics";
import { fetchDestinationInterests } from "../../Configs/AiModel";
import { auth, db } from "../../Configs/FirebaseConfig";
import { CreateTripContext } from "../../context/CreateTripContext";

const GUTTER = Spacing.lg;

// Distinct category colors for visual distinction
const getCategoryBadgeStyle = (category, isDark) => {
  switch (category) {
    case "Beaches":
      return {
        bg: isDark ? "rgba(14, 165, 233, 0.18)" : Palette.skyPale,
        text: isDark ? Palette.skyLight : Palette.skyDark,
        border: isDark ? "rgba(14, 165, 233, 0.35)" : "#BAE6FD",
      };
    case "History":
    case "Museum":
      return {
        bg: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
        text: isDark ? Palette.warningLight : "#B45309",
        border: isDark ? "rgba(245, 158, 11, 0.35)" : "#FDE68A",
      };
    case "Nature":
    case "Adventure":
      return {
        bg: isDark ? "rgba(34, 197, 94, 0.18)" : Palette.greenPale,
        text: isDark ? "#4ADE80" : "#15803D",
        border: isDark ? "rgba(34, 197, 94, 0.35)" : "#BBF7D0",
      };
    case "Viewpoint":
      return {
        bg: isDark ? "rgba(168, 85, 247, 0.18)" : "#EDE9FE",
        text: isDark ? "#C084FC" : "#6D28D9",
        border: isDark ? "rgba(168, 85, 247, 0.35)" : "#DDD6FE",
      };
    case "Food":
      return {
        bg: isDark ? "rgba(244, 63, 94, 0.18)" : "#FFE4E6",
        text: isDark ? "#FB7185" : "#BE123C",
        border: isDark ? "rgba(244, 63, 94, 0.35)" : "#FECDD3",
      };
    case "Shopping":
      return {
        bg: isDark ? "rgba(139, 92, 246, 0.18)" : "#F3E8FF",
        text: isDark ? "#A78BFA" : "#7E22CE",
        border: isDark ? "rgba(139, 92, 246, 0.35)" : "#E9D5FF",
      };
    default:
      return {
        bg: isDark ? "rgba(10, 126, 164, 0.2)" : "rgba(10, 126, 164, 0.08)",
        text: isDark ? Palette.skyLight : Colors.PRIMARY,
        border: isDark ? "rgba(10, 126, 164, 0.35)" : "rgba(10, 126, 164, 0.15)",
      };
  }
};


// ---- Icon helpers: split "🕌 Name" into icon + title and keep icons unique per list ----
const hasLetterOrDigit = (s) => /[A-Za-z0-9À-ɏ؀-ۿ]/.test(s);
const splitIcon = (name = "") => {
  const trimmed = String(name).trim();
  const idx = trimmed.indexOf(" ");
  if (idx > 0 && !hasLetterOrDigit(trimmed.slice(0, idx))) {
    return { icon: trimmed.slice(0, idx), title: trimmed.slice(idx + 1).trim() };
  }
  return { icon: "", title: trimmed };
};

const ICON_POOLS = {
  History: ["🏛️", "🕌", "⛪", "🏰", "🕍", "⛩️", "🗿", "🏺", "📜", "🎭", "🕰️", "🗽"],
  Museum: ["🏛️", "🖼️", "🏺", "📜", "🎨"],
  Nature: ["🌳", "🏞️", "🌊", "⛰️", "🌋", "🌲", "🏜️", "🦋", "🌿", "🍁"],
  Adventure: ["🥾", "🧗", "🚵", "🪂", "🛶"],
  Beaches: ["🏖️", "🌊", "🏝️", "🐚", "⛱️", "🐠"],
  Viewpoint: ["👀", "🗼", "🎡", "🌄", "🔭", "🌇"],
  Food: ["🍴", "☕", "🍲", "🍜", "🍣", "🥐", "🍰", "🍝", "🥘", "🍢"],
  Shopping: ["🛍️", "🧵", "🏬", "🎁", "👜"],
  Attraction: ["📍", "🎬", "🎢", "🎪", "⛲", "🦁"],
};
const GENERIC_ICONS = ["📍", "🧭", "✨", "🎯", "🗺️", "📸", "🎈", "🔖", "🏷️", "🌟"];

/** Returns the list with a unique leading icon per item (where distinct ones are available). */
const dedupeInterestIcons = (list) => {
  const used = new Set();
  return list.map((item) => {
    const { icon, title } = splitIcon(item.name);
    let chosen = icon;
    if (!chosen || used.has(chosen)) {
      const pool = [...(ICON_POOLS[item.category] || []), ...GENERIC_ICONS];
      chosen = pool.find((p) => !used.has(p)) || icon || "📍";
    }
    used.add(chosen);
    return { ...item, _icon: chosen, _title: title };
  });
};

const InterestCard = ({ item, index, isSelected, onPress, theme }) => {
  const [wrapped, setWrapped] = useState(false);
  const accent = Colors.PRIMARY;
  const catStyle = getCategoryBadgeStyle(item.category, theme.isDark);
  const badge = item.category ? (
    <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
      <Text style={[styles.categoryText, { color: catStyle.text }]} numberOfLines={1}>
        {item.category}
      </Text>
    </View>
  ) : null;

  return (
    <FadeInView index={index}>
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${item._title}${item.category ? `, ${item.category}` : ""}`}
        accessibilityHint={item.description || undefined}
        style={[
          styles.card,
          {
            backgroundColor: isSelected ? (theme.isDark ? "rgba(10, 126, 164, 0.12)" : "rgba(10, 126, 164, 0.06)") : theme.card,
            borderColor: isSelected ? accent : theme.border,
          },
        ]}
        onPress={() => onPress(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon} accessibilityElementsHidden importantForAccessibility="no">
            {item._icon}
          </Text>
          <View style={styles.cardTextCol}>
            <View style={styles.cardTitleRow}>
              <Text
                style={[styles.cardName, { color: theme.text }]}
                onTextLayout={(e) => {
                  if (!wrapped && e?.nativeEvent?.lines?.length > 1) setWrapped(true);
                }}
              >
                {item._title}
              </Text>
              {!wrapped ? badge : null}
            </View>
            {wrapped ? <View style={styles.badgeUnder}>{badge}</View> : null}
            {item.description ? (
              <Text style={[styles.cardDescription, { color: theme.subtext }]}>{item.description}</Text>
            ) : null}
          </View>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isSelected ? accent : theme.subtext,
                backgroundColor: isSelected ? accent : "transparent",
              },
            ]}
          >
            {isSelected ? <Ionicons name="checkmark" size={18} color={Palette.white} /> : null}
          </View>
        </View>
      </TouchableOpacity>
    </FadeInView>
  );
};

// Curated iconic landmarks for major destinations (0ms instant render)
const CITY_SPECIFIC_HIGHLIGHTS = {
  istanbul: [
    { id: 'ist-1', name: '🕌 Hagia Sophia Grand Mosque', description: 'Legendary 6th-century Byzantine masterpiece & cultural symbol', category: 'History' },
    { id: 'ist-2', name: '🏛️ Topkapi Palace & Imperial Harem', description: 'Historic residence of Ottoman Sultans overlooking the Bosphorus', category: 'History' },
    { id: 'ist-3', name: '🕌 The Blue Mosque (Sultanahmet)', description: 'Six majestic minarets & stunning blue Iznik tiles', category: 'History' },
    { id: 'ist-4', name: '🛍️ Grand Bazaar & Spice Market', description: 'World-famous covered market with 4,000+ vibrant shops & spices', category: 'Shopping' },
    { id: 'ist-5', name: '🗼 Galata Tower & Bosphorus Views', description: 'Iconic medieval stone tower with 360° panoramas over Istanbul', category: 'Viewpoint' },
    { id: 'ist-6', name: '🌊 Bosphorus Sunset Cruise', description: 'Picturesque sailing between Europe & Asia along the historic strait', category: 'Nature' },
    { id: 'ist-7', name: '🍴 Authentic Ottoman Kebabs & Meze', description: 'Taste legendary Iskender, kebabs & fresh grilled mezes', category: 'Food' },
    { id: 'ist-8', name: '☕ Historic Turkish Coffee & Baklava', description: 'Slow-brewed sand coffee paired with flaky pistachio baklava', category: 'Food' },
  ],
  "united states": [
    { id: 'usa-1', name: '🗽 Statue of Liberty & Ellis Island', description: 'World-renowned symbol of freedom in New York Harbor', category: 'History' },
    { id: 'usa-2', name: '🏙️ Times Square & Broadway Theatres', description: 'Electrifying neon heart of NYC and legendary theatre district', category: 'Attraction' },
    { id: 'usa-3', name: '🌉 Golden Gate Bridge & San Francisco Bay', description: 'Iconic art deco suspension bridge with Pacific ocean vistas', category: 'Viewpoint' },
    { id: 'usa-4', name: '🏞️ Grand Canyon National Park', description: 'Breathtaking 1-mile deep canyon carved by the Colorado River', category: 'Nature' },
    { id: 'usa-5', name: '🌳 Central Park & The Met Museum', description: '843-acre lush urban oasis surrounded by world-class art collections', category: 'Nature' },
    { id: 'usa-6', name: '🍔 Classic American Diners & Texas BBQ', description: 'Savor legendary smash burgers, slow-smoked brisket & soul food', category: 'Food' },
    { id: 'usa-7', name: '🏛️ The Smithsonian & National Mall', description: 'America’s premier historic monuments and free world-class museums', category: 'History' },
    { id: 'usa-8', name: '🎬 Hollywood Walk of Fame & Sunset Blvd', description: 'Global epicenter of cinema, star-studded landmarks & Beverly Hills', category: 'Attraction' },
  ],
  dubai: [
    { id: 'dxb-1', name: '🏙️ Burj Khalifa & Sky Deck', description: 'World’s tallest tower with stunning 360° Arabian Gulf views', category: 'Viewpoint' },
    { id: 'dxb-2', name: '🏜️ Arabian Desert Safari & Dunes', description: 'Thrilling dune bashing, camel trek & sunset Bedouin camp', category: 'Nature' },
    { id: 'dxb-3', name: '🛍️ The Dubai Mall & Dancing Fountain', description: 'Mega shopping destination with mesmerizing light & water shows', category: 'Shopping' },
    { id: 'dxb-4', name: '🏖️ Jumeirah Beach & Palm Promenade', description: 'White sands and turquoise shores overlooking Atlantis', category: 'Beaches' },
    { id: 'dxb-5', name: '🏛️ Museum of the Future', description: 'Architectural wonder showcasing futuristic innovations', category: 'History' },
    { id: 'dxb-6', name: '🍴 Arabian Dining & Street Shawarma', description: 'Authentic Emirati delicacies, shawarmas & luxury dining', category: 'Food' },
  ],
  paris: [
    { id: 'par-1', name: '🗼 Eiffel Tower & Champ de Mars', description: 'Iconic iron lattice tower with panoramic views over Paris', category: 'Viewpoint' },
    { id: 'par-2', name: '🏛️ The Louvre Museum & Glass Pyramid', description: 'Home of the Mona Lisa, Venus de Milo & world treasures', category: 'History' },
    { id: 'par-3', name: '⛪ Notre-Dame Cathedral & Seine Island', description: 'Gothic masterpiece on the Île de la Cité', category: 'History' },
    { id: 'par-4', name: '🛍️ Champs-Élysées & Arc de Triomphe', description: 'Prestigious avenue lined with luxury boutiques & cafes', category: 'Shopping' },
    { id: 'par-5', name: '☕ Authentic Parisian Bistro & Pastries', description: 'Classic cafe terrace, fresh croissants & artisanal coffee', category: 'Food' },
    { id: 'par-6', name: '🎨 Montmartre & Sacré-Cœur Basilica', description: 'Bohemian artist hilltop with breathtaking city skyline', category: 'Viewpoint' },
  ],
  tokyo: [
    { id: 'tyo-1', name: '🗼 Tokyo Tower & Shibuya Sky', description: 'Futuristic observation decks with panoramic city views', category: 'Viewpoint' },
    { id: 'tyo-2', name: '⛩️ Senso-ji Temple & Asakusa', description: 'Tokyo’s oldest Buddhist temple and traditional street shops', category: 'History' },
    { id: 'tyo-3', name: '🚶 Shibuya Crossing & Hachiko', description: 'World’s busiest pedestrian crossing & vibrant neon district', category: 'Attraction' },
    { id: 'tyo-4', name: '🍣 Tsukiji Outer Market & Omakase Sushi', description: 'World-renowned fresh seafood, wagyu skewers & matcha', category: 'Food' },
    { id: 'tyo-5', name: '🌳 Shinjuku Gyoen National Garden', description: 'Tranquil Japanese gardens, cherry blossoms & ponds', category: 'Nature' },
    { id: 'tyo-6', name: '🛍️ Akihabara & Ginza Shopping', description: 'High-tech electronics, anime culture & luxury retail', category: 'Shopping' },
  ],
  rome: [
    { id: 'rom-1', name: '🏛️ The Colosseum & Roman Forum', description: 'Ancient amphitheater & heart of the Roman Empire', category: 'History' },
    { id: 'rom-2', name: '⛲ Trevi Fountain & Spanish Steps', description: 'Baroque masterpiece fountain and elegant landmark steps', category: 'Attraction' },
    { id: 'rom-3', name: '⛪ Vatican City & St. Peter’s Basilica', description: 'Sistine Chapel, Michelangelo frescoes & sacred architecture', category: 'History' },
    { id: 'rom-4', name: '🏛️ The Pantheon & Piazza Navona', description: 'Ancient dome with central oculus & vibrant street artists', category: 'History' },
    { id: 'rom-5', name: '🍝 Authentic Trastevere Pasta & Gelato', description: 'Handmade carbonara, cacio e pepe & artisanal gelato', category: 'Food' },
  ],
  london: [
    { id: 'lon-1', name: '🕰️ Big Ben & Palace of Westminster', description: 'Iconic neo-Gothic clock tower & Houses of Parliament', category: 'History' },
    { id: 'lon-2', name: '🎡 The London Eye & River Thames', description: 'Giant observation wheel with skyline views across London', category: 'Viewpoint' },
    { id: 'lon-3', name: '🏛️ The British Museum', description: 'World-famous museum of human history, art and Rosetta Stone', category: 'History' },
    { id: 'lon-4', name: '🏰 Tower of London & Tower Bridge', description: 'Historic fortress holding the dazzling Crown Jewels', category: 'History' },
    { id: 'lon-5', name: '🌳 Hyde Park & Kensington Gardens', description: 'Sprawling royal parklands and serene boating lakes', category: 'Nature' },
    { id: 'lon-6', name: '🍴 Borough Market Gourmet Food', description: 'Historic food market with artisan cheese, pastries & street food', category: 'Food' },
  ],
  lahore: [
    { id: 'lhr-1', name: '🕌 Badshahi Mosque & Courtyard', description: 'Grand 17th-century Mughal architectural marvel', category: 'History' },
    { id: 'lhr-2', name: '🏰 Lahore Fort (Shahi Qila)', description: 'UNESCO World Heritage citadel with Sheesh Mahal mirror palace', category: 'History' },
    { id: 'lhr-3', name: '🍲 Food Street Fort Road & Anarkali', description: 'Legendary Karahi, Nihari & Barbecue under illuminated minarets', category: 'Food' },
    { id: 'lhr-4', name: '🛍️ Liberty Market & MM Alam Road', description: 'Vibrant retail hub with traditional embroidery & trendy bistros', category: 'Shopping' },
    { id: 'lhr-5', name: '🌳 Shalimar Gardens', description: 'Historic Mughal triple-terraced water gardens & fountains', category: 'Nature' },
    { id: 'lhr-6', name: '☕ Historic Pak Tea House & Chai', description: 'Iconic meeting place of literary legends and slow-brewed tea', category: 'Food' },
  ],
  bali: [
    { id: 'bali-1', name: '🌊 Tanah Lot & Uluwatu Cliff Temple', description: 'Ancient coastal sea temples perched on dramatic ocean bluffs', category: 'History' },
    { id: 'bali-2', name: '🐒 Ubud Sacred Monkey Forest & Rice Terraces', description: 'Lush tropical jungles, roaming macaques & emerald terraces', category: 'Nature' },
    { id: 'bali-3', name: '🏖️ Seminyak Beach & Beach Clubs', description: 'Golden sunset sands, surfing waves & vibrant evening music', category: 'Beaches' },
    { id: 'bali-4', name: '🌋 Mount Batur Sunrise Trek', description: 'Spectacular early morning volcano summit hike above the clouds', category: 'Nature' },
    { id: 'bali-5', name: '🍲 Authentic Balinese Warung & Satay', description: 'Taste spicy sambal, crispy duck and grilled satay skewers', category: 'Food' },
  ],
  canada: [
    { id: 'can-1', name: '🌊 Niagara Falls & Horseshoe Views', description: 'World-famous thunderous waterfalls and misty boat tours', category: 'Nature' },
    { id: 'can-2', name: '🏞️ Banff National Park & Lake Louise', description: 'Turquoise glacial alpine lakes framed by dramatic Rocky Peaks', category: 'Nature' },
    { id: 'can-3', name: '🗼 CN Tower & Toronto Skyline', description: '553m communications tower with glass observation floor', category: 'Viewpoint' },
    { id: 'can-4', name: '🍁 Old Quebec Historic Walled City', description: 'Charming European cobblestones, ramparts & Château Frontenac', category: 'History' },
    { id: 'can-5', name: '🌲 Stanley Park & Seawall Vancouver', description: 'Massive coastal rainforest park surrounded by ocean seawall', category: 'Nature' },
    { id: 'can-6', name: '🥞 Authentic Poutine & Maple Delights', description: 'Warm crispy fries, fresh cheese curds & rich savory gravy', category: 'Food' },
  ],
  singapore: [
    { id: 'sg-1', name: '🌳 Gardens by the Bay & Supertrees', description: 'Futuristic vertical gardens, Flower Dome & evening light show', category: 'Nature' },
    { id: 'sg-2', name: '🏨 Marina Bay Sands SkyPark', description: 'Iconic triple tower observation deck with panoramic city skyline', category: 'Viewpoint' },
    { id: 'sg-3', name: '🍜 Lau Pa Sat & Maxwell Hawker Markets', description: 'World-renowned Hainanese chicken rice, laksa & satay street', category: 'Food' },
    { id: 'sg-4', name: '🛍️ Orchard Road Shopping Belt', description: 'Premier 2km boulevard of high-end fashion malls and boutiques', category: 'Shopping' },
    { id: 'sg-5', name: '🦁 Merlion Park & Marina Bay', description: 'Legendary half-lion half-fish national icon spraying into the bay', category: 'Attraction' },
  ],
  cairo: [
    { id: 'cai-1', name: '🏛️ The Great Pyramids of Giza & Sphinx', description: 'Last remaining Ancient Wonder of the World and colossal Sphinx', category: 'History' },
    { id: 'cai-2', name: '🏛️ The Grand Egyptian Museum', description: 'Priceless treasures of King Tutankhamun and thousands of artifacts', category: 'History' },
    { id: 'cai-3', name: '🛍️ Khan el-Khalili Historic Souk', description: 'Labyrinthine 14th-century marketplace with lanterns & spices', category: 'Shopping' },
    { id: 'cai-4', name: '⛵ Nile River Sunset Felucca', description: 'Peaceful traditional wooden sailboat cruising the historic Nile', category: 'Nature' },
    { id: 'cai-5', name: '🍲 Authentic Koshary & Street Shawarma', description: 'Egypt’s legendary national dish with spiced lentils & tomato sauce', category: 'Food' },
  ],
};

const DESTINATION_CANONICAL_MAP = {
  "united states": "united states",
  "usa": "united states",
  "us": "united states",
  "america": "united states",
  "new york": "united states",
  "nyc": "united states",
  "california": "united states",
  "san francisco": "united states",
  "los angeles": "united states",
  "miami": "united states",
  "chicago": "united states",
  "washington": "united states",
  "turkey": "istanbul",
  "turkiye": "istanbul",
  "istanbul": "istanbul",
  "dubai": "dubai",
  "uae": "dubai",
  "emirates": "dubai",
  "abu dhabi": "dubai",
  "paris": "paris",
  "france": "paris",
  "tokyo": "tokyo",
  "japan": "tokyo",
  "kyoto": "tokyo",
  "rome": "rome",
  "italy": "rome",
  "italia": "rome",
  "london": "london",
  "uk": "london",
  "united kingdom": "london",
  "england": "london",
  "britain": "london",
  "lahore": "lahore",
  "pakistan": "lahore",
  "bali": "bali",
  "indonesia": "bali",
  "canada": "canada",
  "toronto": "canada",
  "vancouver": "canada",
  "singapore": "singapore",
  "cairo": "cairo",
  "egypt": "cairo",
};

// Curated authentic transit modes for destinations (0ms instant render)
const CITY_TRANSPORTS = {
  istanbul: [
    { id: "ist-metro", name: "🚇 Metro & Marmaray" },
    { id: "ist-tram", name: "🚋 Historic Tram (T1)" },
    { id: "ist-ferry", name: "⛴️ Bosphorus Ferry" },
    { id: "ist-taxi", name: "🚕 Yellow Taxi & BiTaksi" },
    { id: "ist-walk", name: "🚶 Walking & Historic Alleys" },
  ],
  "united states": [
    { id: "usa-subway", name: "🚇 Subway & Metro" },
    { id: "usa-taxi", name: "🚕 Yellow Cab / Uber / Lyft" },
    { id: "usa-train", name: "🚆 Amtrak Intercity Rail" },
    { id: "usa-car", name: "🚗 Interstate Road Trip / Rental" },
    { id: "usa-walk", name: "🚶 City Walking & Avenues" },
  ],
  dubai: [
    { id: "dxb-metro", name: "🚇 Dubai Metro" },
    { id: "dxb-taxi", name: "🚕 RTA Taxi / Careem" },
    { id: "dxb-monorail", name: "🚝 Palm Monorail" },
    { id: "dxb-abra", name: "🛶 Traditional Abra" },
    { id: "dxb-walk", name: "🚶 Marina & Promenade" },
  ],
  paris: [
    { id: "par-metro", name: "🚇 Paris Métro & RER" },
    { id: "par-walk", name: "🚶 Walking Boulevards" },
    { id: "par-bus", name: "🚌 City Bus" },
    { id: "par-bike", name: "🚲 Vélib' Bike" },
    { id: "par-taxi", name: "🚕 Paris Taxi / Uber" },
  ],
  tokyo: [
    { id: "tyo-jr", name: "🚆 JR Yamanote Line" },
    { id: "tyo-subway", name: "🚇 Tokyo Subway" },
    { id: "tyo-walk", name: "🚶 Walking Neon Streets" },
    { id: "tyo-taxi", name: "🚕 Tokyo Taxi" },
    { id: "tyo-bullet", name: "🚅 Shinkansen Bullet Train" },
  ],
  rome: [
    { id: "rom-walk", name: "🚶 Walking Cobblestones" },
    { id: "rom-metro", name: "🚇 Rome Metro" },
    { id: "rom-bus", name: "🚌 City Bus & Tram" },
    { id: "rom-taxi", name: "🚕 White City Taxi" },
    { id: "rom-scooter", name: "🛵 Vespa / E-Scooter" },
  ],
  london: [
    { id: "lon-tube", name: "🚇 Underground (The Tube)" },
    { id: "lon-bus", name: "🚌 Red Double-Decker Bus" },
    { id: "lon-walk", name: "🚶 Walking Thames Riverbank" },
    { id: "lon-blackcab", name: "🚕 Traditional Black Cab" },
    { id: "lon-uberboat", name: "🛥️ Uber Thames Boat" },
  ],
  lahore: [
    { id: "lhr-metro", name: "🚇 Orange Line Metro" },
    { id: "lhr-bus", name: "🚌 Speedo City Bus" },
    { id: "lhr-rickshaw", name: "🛺 Qingqi / Auto Rickshaw" },
    { id: "lhr-taxi", name: "🚕 Uber / Careem / Yango" },
    { id: "lhr-walk", name: "🚶 Walled City Heritage Walk" },
  ],
  bali: [
    { id: "bali-driver", name: "🚗 Private Driver & Car" },
    { id: "bali-scooter", name: "🛵 Scooter / Gojek Rental" },
    { id: "bali-taxi", name: "🚕 Bluebird Taxi" },
    { id: "bali-shuttle", name: "🚐 Tourist Island Shuttle" },
    { id: "bali-walk", name: "🚶 Beachfront Walking" },
  ],
  canada: [
    { id: "can-subway", name: "🚇 Metro / TTC / SkyTrain" },
    { id: "can-taxi", name: "🚕 Uber / City Taxi" },
    { id: "can-rail", name: "🚆 VIA Rail Passenger Train" },
    { id: "can-car", name: "🚗 Highway Car Rental" },
    { id: "can-walk", name: "🚶 Downtown Pedestrian Walk" },
  ],
  singapore: [
    { id: "sg-mrt", name: "🚇 MRT Subway Network" },
    { id: "sg-bus", name: "🚌 Double-Decker City Bus" },
    { id: "sg-taxi", name: "🚕 Grab / ComfortDelGro Taxi" },
    { id: "sg-walk", name: "🚶 Marina Bay Waterfront Walk" },
    { id: "sg-monorail", name: "🚝 Sentosa Express Monorail" },
  ],
  cairo: [
    { id: "cai-metro", name: "🚇 Cairo Metro" },
    { id: "cai-taxi", name: "🚕 White City Taxi / Uber" },
    { id: "cai-felucca", name: "⛵ Traditional Nile Felucca" },
    { id: "cai-walk", name: "🚶 Historic Islamic Cairo Walk" },
    { id: "cai-shuttle", name: "🚐 Tourist Giza Shuttle" },
  ],
};

const resolveDestinationKey = (dest = "") => {
  const d = (dest || "").toLowerCase().trim();
  for (const [alias, canonicalKey] of Object.entries(DESTINATION_CANONICAL_MAP)) {
    if (d.includes(alias)) {
      return canonicalKey;
    }
  }
  return null;
};

const getSmartDestinationTransports = (dest = "") => {
  const canonical = resolveDestinationKey(dest);
  if (canonical && CITY_TRANSPORTS[canonical]) {
    return CITY_TRANSPORTS[canonical];
  }
  return [
    { id: "taxi", name: "🚕 Local Taxi / Ride-Hailing" },
    { id: "metro", name: "🚇 Metro & Train" },
    { id: "walk", name: "🚶 Walking" },
    { id: "bus", name: "🚌 Local Bus" },
    { id: "rental", name: "🚗 Car Rental" },
  ];
};

// Curated highlights tailored to destination geography (0ms instant initial render)
const getSmartDestinationInterests = (dest = "") => {
  const canonical = resolveDestinationKey(dest);
  if (canonical && CITY_SPECIFIC_HIGHLIGHTS[canonical]) {
    return CITY_SPECIFIC_HIGHLIGHTS[canonical];
  }

  const d = (dest || "").toLowerCase();
  const isBeach = /beach|coast|island|bali|maldives|phuket|miami|cancun|hawaii|goa|santorini|bahamas|krabi/i.test(d);
  const isHistoric = /rome|paris|cairo|athens|kyoto|lahore|london|delhi|florence|beijing|agra/i.test(d);
  const isMountain = /alps|mountain|hike|swiss|banff|aspen|manali|nepal|queenstown|murree|swat/i.test(d);

  return [
    ...(isBeach ? [
      { id: 'smart-beach-1', name: '🏖️ Scenic Beach & Coastline', description: 'Sunbathing, turquoise waters & seaside promenades', category: 'Beaches' },
      { id: 'smart-beach-2', name: '🌊 Coastal Water Sports & Cruise', description: 'Snorkeling, paddleboarding or sunset catamaran cruise', category: 'Beaches' },
    ] : []),
    ...(isHistoric ? [
      { id: 'smart-hist-1', name: '🏛️ Iconic Ancient Monument & Heritage', description: 'World-renowned architectural marvels & ancient heritage', category: 'History' },
      { id: 'smart-hist-2', name: '🏰 National Museum & Royal Palaces', description: 'Curated historic artifacts & grand royal halls', category: 'History' },
    ] : [
      { id: 'smart-hist-def', name: '🏛️ Historic Old Town & Heritage', description: 'Explore ancient architecture, squares & local heritage', category: 'History' },
    ]),
    ...(isMountain ? [
      { id: 'smart-mount-1', name: '⛰️ Alpine Peak & Summit Viewpoint', description: 'Dramatic panoramic mountain ridges & fresh air', category: 'Nature' },
      { id: 'smart-mount-2', name: '🥾 Scenic Forest & Hiking Trails', description: 'Curated alpine trails, waterfalls & nature walks', category: 'Nature' },
    ] : [
      { id: 'smart-nat-def', name: '🌳 Scenic Nature & Urban Parks', description: 'Relaxing botanical gardens & peaceful green oases', category: 'Nature' },
    ]),
    { id: 'smart-food-1', name: '🍴 Authentic Local Dining & Bistros', description: 'Taste legendary regional dishes & chef favorites', category: 'Food' },
    { id: 'smart-food-2', name: '☕ Artisanal Cafe & Street Delights', description: 'Famous local coffee spots, bakeries & sweets', category: 'Food' },
    { id: 'smart-view-1', name: '👀 360° Sky High Observation Deck', description: 'Breathtaking bird’s-eye perspective of the destination', category: 'Viewpoint' },
    { id: 'smart-shop-1', name: '🛍️ Traditional Souk & Artisan Market', description: 'Handcrafted souvenirs, textiles & local treasures', category: 'Shopping' },
  ];
};

export default function YourInterest() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();

  const { tripData, setTripData } = useContext(CreateTripContext);
  const destinationName = tripData?.toLocation?.name?.split(",")[0] || "your destination";

  const [placesList, setPlacesList] = useState(() =>
    getSmartDestinationInterests(tripData?.toLocation?.name)
  );
  const [transportList, setTransportList] = useState(() =>
    getSmartDestinationTransports(tripData?.toLocation?.name)
  );
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(() => {
    const defaultList = getSmartDestinationTransports(tripData?.toLocation?.name);
    return tripData?.transport || defaultList[0]?.id || "taxi";
  });
  const [activeCategory, setActiveCategory] = useState("all");
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  const retryTimerRef = useRef(null);
  const nextAllowedRequestAtRef = useRef(0);

  const triggerHaptic = () => tapHaptic();







  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, []);

  const startRetryCountdown = (seconds) => {
    if (!seconds || seconds <= 0) return;
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    setRetryAfterSeconds(seconds);
    retryTimerRef.current = setInterval(() => {
      setRetryAfterSeconds((s) => {
        if (s <= 1) {
          clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };


  const updateTransports = (list) => {
    if (Array.isArray(list) && list.length > 0) {
      setTransportList(list);
      setSelectedTransport((prev) => (list.some((t) => t.id === prev) ? prev : list[0].id));
    }
  };

  const GetDynamicInterests = async () => {
    try {
      const now = Date.now();
      if (now < nextAllowedRequestAtRef.current) {
        const waitSec = Math.ceil((nextAllowedRequestAtRef.current - now) / 1000);
        startRetryCountdown(waitSec);
        setErrorMessage(`Please wait ${waitSec}s before retrying`);
        return;
      }

      setLoadingInterests(true);
      setErrorMessage(null);
      const locationName = tripData?.toLocation?.name || destinationName;

      if (!locationName || locationName === "your destination") {
        setLoadingInterests(false);
        return;
      }

      const cacheKey = `@goguide_interests_${destinationName.trim().toLowerCase()}`;

      // Check local cache for 0ms retrieval
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed?.interests) && parsed.interests.length > 0) {
            setPlacesList(parsed.interests);
            updateTransports(parsed?.transports);
            setLoadingInterests(false);
            return;
          }
        }
      } catch {}

      // 1. Primary: Server-side AI (/destination/interests) with multi-model fallback (Gemini -> NVIDIA -> DeepSeek)
      let aiResponse = null;
      try {
        aiResponse = await Promise.race([
          fetchDestinationInterests(locationName),
          new Promise((_, reject) => setTimeout(() => reject(new Error("AI response timeout")), 4000)),
        ]);
      } catch (aiErr) {
        console.log("[Interests] Live AI fetch notice:", aiErr.message);
      }

      if (aiResponse && Array.isArray(aiResponse.interests) && aiResponse.interests.length > 0) {
        setPlacesList(aiResponse.interests);
        updateTransports(aiResponse.transports);
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(aiResponse));
        } catch {}
        setLoadingInterests(false);
        return;
      }

      // 2. Fallback: Fast OSM Nominatim Fetch to discover local landmarks if AI is unavailable
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=15&q=attractions+in+${encodeURIComponent(destinationName)}`
        );
        const nomData = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          const fetchedPlaces = nomData
            .map((item, idx) => {
              const name = (item.name || item.display_name?.split(",")[0] || "").trim();
              if (!name || name.length < 2) return null;
              return {
                id: `nom-${item.place_id || idx}`,
                name: `📍 ${name}`,
                description: item.display_name?.split(",").slice(1, 3).join(",").trim() || "Popular landmark & attraction",
                category: "Attraction",
              };
            })
            .filter(Boolean);

          if (fetchedPlaces.length > 0) {
            setPlacesList((prev) => {
              const existingNames = new Set(prev.map((p) => p.name.replace(/^[^\w\s]+/, "").trim().toLowerCase()));
              const novel = fetchedPlaces.filter(
                (p) => !existingNames.has(p.name.replace(/^[^\w\s]+/, "").trim().toLowerCase())
              );
              return [...prev, ...novel.slice(0, 8)];
            });
            try {
              await AsyncStorage.setItem(cacheKey, JSON.stringify({ interests: fetchedPlaces, transports: transportList }));
            } catch {}
          }
        }
      } catch (nomErr) {
        console.log("[Interests] Nominatim search note:", nomErr.message);
      }
    } catch (error) {
      console.log("[Interests] Error fetching interests:", error?.message);
      setErrorMessage("We couldn't load live highlights. Check your connection and try again.");
    } finally {
      setLoadingInterests(false);
    }
  };

  useEffect(() => {
    if (tripData?.toLocation?.name) {
      GetDynamicInterests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs on mount only / depends on stable references; adding the flagged dependency would re-run it on every render
  }, [tripData?.toLocation?.name]);

  // Compute dynamic category recommendations based on what actually exists for this destination
  const availableCategories = useMemo(() => {
    const counts = {};
    placesList.forEach((p) => {
      const cat = p.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const categories = [
      { id: "all", label: "All Spots", icon: "✨", count: placesList.length },
    ];

    const categoryMeta = {
      History: { label: "History & Heritage", icon: "🏛️" },
      Beaches: { label: "Beaches & Coastal", icon: "🏖️" },
      Nature: { label: "Nature & Adventure", icon: "⛰️" },
      Food: { label: "Food & Culinary", icon: "🍴" },
      Viewpoint: { label: "Viewpoints", icon: "👀" },
      Shopping: { label: "Shopping", icon: "🛍️" },
      Attraction: { label: "Attractions", icon: "📍" },
      Leisure: { label: "Parks & Leisure", icon: "🌳" },
    };

    Object.keys(counts).forEach((cat) => {
      const meta = categoryMeta[cat] || { label: cat, icon: "📍" };
      categories.push({
        id: cat,
        label: meta.label,
        icon: meta.icon,
        count: counts[cat],
      });
    });

    return categories;
  }, [placesList]);

  // Filter list by selected category tab
  const filteredPlaces = useMemo(() => {
    if (activeCategory === "all") return placesList;
    return placesList.filter((p) => (p.category || "General") === activeCategory);
  }, [placesList, activeCategory]);

  const displayPlaces = useMemo(() => dedupeInterestIcons(filteredPlaces), [filteredPlaces]);

  const togglePlace = (id) => {
    selectHaptic();
    if (selectedPlaces.includes(id)) {
      setSelectedPlaces(selectedPlaces.filter((p) => p !== id));
    } else {
      setSelectedPlaces([...selectedPlaces, id]);
    }
  };

  const persistSavedInterests = (names) => {
    (async () => {
      try {
        await AsyncStorage.setItem("@goguide_saved_interests", JSON.stringify(names));
      } catch {}
      try {
        const uid = auth?.currentUser?.uid;
        if (uid) await setDoc(doc(db, "users", uid), { savedInterests: names }, { merge: true });
      } catch {}
    })();
  };

  const handleContinue = () => {
    triggerHaptic();
    if (selectedPlaces.length > 0) {
      const finalTransport = selectedTransport || transportList[0]?.id || "taxi";
      const selectedInterestItems = placesList.filter((p) =>
        selectedPlaces.includes(p.id)
      );
      const selectedTransportItem =
        transportList.find((t) => t.id === finalTransport) || transportList[0] || null;

      const chosenCategories = Array.from(
        new Set(selectedInterestItems.map((i) => i.category).filter(Boolean))
      );

      // Persist chosen interest names to the user profile (additive field; never blocks navigation)
      const savedNames = dedupeInterestIcons(placesList)
        .filter((p) => selectedPlaces.includes(p.id))
        .map((p) => p._title)
        .filter(Boolean);
      persistSavedInterests(savedNames);

      setTripData((prev) => ({
        ...prev,
        interests: selectedPlaces,
        transport: finalTransport,
        interestsDetails: selectedInterestItems,
        transportDetails: selectedTransportItem,
        selectedCategories: chosenCategories,
      }));
      router.push("/create-trip/select-dates");
    }
  };

  const selectedCount = selectedPlaces.length;
  const showSkeleton = loadingInterests && placesList.length === 0;
  const showFatalError = !!errorMessage && !loadingInterests && placesList.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader title="Your interests" />

      <FlatList
        data={showSkeleton || showFatalError ? [] : displayPlaces}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 84 }]}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <StepProgressBar currentStep={2} totalSteps={5} stepTitle="Select Interests" />
            <Text style={[styles.heroPreTitle, { color: Colors.PRIMARY }]}>TRIP DNA</Text>
            <View style={styles.titleBadgeRow}>
              <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
                What excites you most?
              </Text>
              {selectedCount > 0 && (
                <View
                  style={[styles.counterBadge, { backgroundColor: theme.isDark ? "rgba(10, 126, 164, 0.22)" : "rgba(10, 126, 164, 0.12)" }]}
                  accessibilityLiveRegion="polite"
                >
                  <Text style={[styles.counterBadgeText, { color: Colors.PRIMARY }]}>{selectedCount} Selected</Text>
                </View>
              )}
            </View>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>
              Curated highlights for{" "}
              <Text style={[styles.locationHighlight, { color: Colors.PRIMARY }]}>{destinationName}</Text>
            </Text>
            <Text style={[styles.helperText, { color: theme.subtext }]}>Select all that interest you</Text>

            {availableCategories.length > 1 && !loadingInterests && (
              <View style={styles.categorySection}>
                <Text style={[styles.categoryHeading, { color: theme.subtext }]} numberOfLines={1}>
                  Categories for {destinationName}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScrollWrap}
                  contentContainerStyle={styles.categoryScroll}
                  accessibilityLabel="Filter by category"
                >
                  {availableCategories.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${cat.label}, ${cat.count} places`}
                        accessibilityState={{ selected: isActive }}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isActive ? Colors.PRIMARY : theme.card,
                            borderColor: isActive ? Colors.PRIMARY : theme.border,
                          },
                        ]}
                        onPress={() => {
                          selectHaptic();
                          setActiveCategory(cat.id);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                        <Text style={[styles.categoryChipLabel, { color: isActive ? Palette.white : theme.text }]}>
                          {cat.label}
                        </Text>
                        <View
                          style={[
                            styles.countBadge,
                            { backgroundColor: isActive ? "rgba(255, 255, 255, 0.25)" : theme.border },
                          ]}
                        >
                          <Text style={[styles.countBadgeText, { color: isActive ? Palette.white : theme.subtext }]}>
                            {cat.count}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">
                {activeCategory === "all"
                  ? "Popular Highlights"
                  : availableCategories.find((c) => c.id === activeCategory)?.label || "Activities"}
              </Text>
              {!loadingInterests && (
                <TouchableOpacity
                  onPress={GetDynamicInterests}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh highlights"
                  style={styles.refreshBtn}
                >
                  <Ionicons name="refresh" size={16} color={Colors.PRIMARY} />
                  <Text style={[styles.refreshText, { color: Colors.PRIMARY }]}>Refresh</Text>
                </TouchableOpacity>
              )}
            </View>

            {showSkeleton && (
              <View accessibilityLabel={`Loading highlights for ${destinationName}`} style={styles.skeletonList}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, gap: Spacing.sm }]}>
                    <Skeleton width="65%" height={18} />
                    <Skeleton width="90%" height={14} />
                  </View>
                ))}
              </View>
            )}

            {loadingInterests && placesList.length > 0 && (
              <View style={[styles.loadingBannerPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ActivityIndicator size="small" color={Colors.PRIMARY} style={{ marginRight: Spacing.sm }} />
                <Text style={[styles.loadingBannerText, { color: theme.subtext }]}>
                  Discovering live local highlights for {destinationName}...
                </Text>
              </View>
            )}

            {showFatalError && (
              <EmptyState
                icon="cloud-offline-outline"
                title="Couldn't load highlights"
                text={errorMessage}
                actionLabel={retryAfterSeconds > 0 ? `Retry in ${retryAfterSeconds}s` : "Try again"}
                onAction={retryAfterSeconds > 0 ? undefined : GetDynamicInterests}
              />
            )}

            {errorMessage && !loadingInterests && placesList.length > 0 && (
              <View style={[styles.errorContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="alert-circle-outline" size={20} color={theme.subtext} />
                <Text style={[styles.errorText, { color: theme.text }]}>{errorMessage}</Text>
                <TouchableOpacity
                  onPress={GetDynamicInterests}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading highlights"
                  accessibilityState={{ disabled: retryAfterSeconds > 0 }}
                  style={[styles.retryBtn, retryAfterSeconds > 0 && styles.retryBtnDisabled]}
                  disabled={retryAfterSeconds > 0}
                >
                  <Text style={styles.retryText}>
                    {retryAfterSeconds > 0 ? `Retry in ${retryAfterSeconds}s` : "Retry"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <InterestCard
            item={item}
            index={index}
            isSelected={selectedPlaces.includes(item.id)}
            onPress={togglePlace}
            theme={theme}
          />
        )}
        ListEmptyComponent={
          !loadingInterests && !showFatalError ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>No activities found in this category.</Text>
              <TouchableOpacity
                onPress={() => setActiveCategory("all")}
                accessibilityRole="button"
                accessibilityLabel="View all activities"
                style={styles.retryMinBtn}
              >
                <Text style={styles.retryMinText}>View All Activities</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.footerArea}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">
              Best Way to Travel
            </Text>
            <Text style={[styles.helperText, { color: theme.subtext }]}>Choose one</Text>

            <View style={styles.transportContainer} accessibilityRole="radiogroup">
              {transportList.map((item) => {
                const active = selectedTransport === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active, selected: active }}
                    accessibilityLabel={splitIcon(item.name).title}
                    style={[
                      styles.transportCard,
                      {
                        backgroundColor: active ? (theme.isDark ? "rgba(10, 126, 164, 0.12)" : "rgba(10, 126, 164, 0.06)") : theme.card,
                        borderColor: active ? Colors.PRIMARY : theme.border,
                      },
                    ]}
                    onPress={() => {
                      selectHaptic();
                      setSelectedTransport(item.id);
                    }}
                  >
                    {active ? <Ionicons name="checkmark-circle" size={16} color={Colors.PRIMARY} style={{ marginRight: 6 }} /> : null}
                    <Text style={[styles.transportText, { color: active ? Colors.PRIMARY : theme.text }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
      />

      {/* Sticky confirm bar */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm,
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={selectedCount > 0 ? `Confirm ${selectedCount} selected and continue` : "Select at least 1"}
          accessibilityState={{ disabled: selectedCount === 0 }}
          style={[
            styles.button,
            { backgroundColor: Colors.PRIMARY },
            selectedCount === 0 && { backgroundColor: theme.border },
          ]}
          onPress={handleContinue}
          disabled={selectedCount === 0}
        >
          <Text style={[styles.buttonText, selectedCount === 0 && { color: theme.subtext }]}>
            {selectedCount > 0 ? `Confirm (${selectedCount}) & Continue` : "Select at least 1"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: GUTTER },
  headerArea: { paddingTop: Spacing.sm },
  heroPreTitle: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontBold,
    letterSpacing: 1.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  titleBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.xs, gap: Spacing.sm },
  title: { fontSize: Typography.sizeXxl, fontFamily: Typography.fontBold, letterSpacing: -0.5, flex: 1, flexShrink: 1 },
  counterBadge: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.md },
  counterBadgeText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  subtitle: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, marginTop: 6 },
  locationHighlight: { fontFamily: Typography.fontBold },
  helperText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, marginTop: 4 },
  categorySection: { marginTop: Spacing.lg },
  categoryHeading: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, marginBottom: Spacing.sm },
  categoryScrollWrap: { marginHorizontal: -GUTTER },
  categoryScroll: { paddingHorizontal: GUTTER, gap: Spacing.sm },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  categoryChipIcon: { fontSize: Typography.sizeMd, marginRight: 6 },
  categoryChipLabel: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
  countBadge: { marginLeft: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.md, minWidth: 22, alignItems: "center" },
  countBadgeText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.sizeLg, fontFamily: Typography.fontBold, flexShrink: 1 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingHorizontal: Spacing.sm },
  refreshText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
  skeletonList: { gap: Spacing.md },
  loadingBannerPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  loadingBannerText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, flex: 1 },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, flex: 1, minWidth: 140 },
  retryBtn: { minHeight: 44, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill, backgroundColor: Colors.PRIMARY, alignItems: "center", justifyContent: "center" },
  retryBtnDisabled: { opacity: 0.5 },
  retryText: { color: Palette.white, fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  emptyContainer: { alignItems: "center", paddingVertical: Spacing.xxl },
  emptyText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, marginBottom: Spacing.md },
  retryMinBtn: { minHeight: 44, paddingHorizontal: Spacing.lg, justifyContent: "center" },
  retryMinText: { color: Colors.PRIMARY, fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  card: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    minHeight: 64,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  cardIcon: { fontSize: Typography.sizeXxl, width: 32, textAlign: "center" },
  cardTextCol: { flex: 1, flexShrink: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  cardName: { flex: 1, flexShrink: 1, fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  badgeUnder: { flexDirection: "row", marginTop: 6 },
  categoryBadge: { flexShrink: 0, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1 },
  categoryText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },
  cardDescription: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, lineHeight: 20, marginTop: 6 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: Radius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footerArea: { marginTop: Spacing.xl },
  transportContainer: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.md },
  transportCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  transportText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  button: { minHeight: 52, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center" },
  buttonText: { color: Palette.white, fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
});
