import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Platform,
  Modal,
  ActivityIndicator 
} from "react-native";
import * as Haptics from "expo-haptics";
import React, { useContext, useState, useRef, useEffect } from "react";
import { Colors } from "../../Components/constants/constants";
import { CreateTripContext } from "../../context/CreateTripContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { generateTripWithAgent } from "../../Configs/AiModel";

// Pre-curated instant AI vibe trips
const QUICK_AI_VIBES = [
  {
    id: "dubai",
    title: "Dubai Luxury Weekend",
    icon: "diamond-outline",
    color: "#8B5CF6",
    destination: "Dubai, United Arab Emirates",
    days: 3,
    budget: "Luxury",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop",
    tag: "💎 Luxury • 3 Days"
  },
  {
    id: "tokyo",
    title: "Tokyo Anime & Culinary",
    icon: "restaurant-outline",
    color: "#EC4899",
    destination: "Tokyo, Japan",
    days: 4,
    budget: "Moderate",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800&auto=format&fit=crop",
    tag: "🍜 Food & Culture • 4 Days"
  },
  {
    id: "bali",
    title: "Bali Tropical Escape",
    icon: "sunny-outline",
    color: "#F59E0B",
    destination: "Bali, Indonesia",
    days: 5,
    budget: "Economical",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop",
    tag: "🏖️ Beaches • 5 Days"
  },
  {
    id: "rome",
    title: "Rome Historic Holiday",
    icon: "compass-outline",
    color: "#10B981",
    destination: "Rome, Italy",
    days: 3,
    budget: "Moderate",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=800&auto=format&fit=crop",
    tag: "🏛️ History • 3 Days"
  }
];

export default function Discover() {
  const router = useRouter();
  const { preferences, setTripData } = useContext(CreateTripContext);
  const isDark = preferences?.darkMode;
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const timeoutRef = useRef(null);

  // AI Magic Prompt State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState(1);
  const [aiError, setAiError] = useState(null);

  const categories = [
    { id: 1, title: "Beaches", icon: "water" },
    { id: 2, title: "Mountains", icon: "triangle" },
    { id: 3, title: "Cities", icon: "business" },
    { id: 4, title: "Camping", icon: "bonfire" },
    { id: 5, title: "Forest", icon: "leaf" },
  ];

  const popularDestinations = [
    {
      id: 1,
      title: "Paris, France",
      image: "https://images.unsplash.com/photo-1502602898657-3e907fa0a586?q=80&w=600&auto=format&fit=crop",
      rating: "4.9",
      liked: true,
      lat: "48.8566",
      lon: "2.3522",
    },
    {
      id: 2,
      title: "Tokyo, Japan",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop",
      rating: "4.8",
      liked: false,
      lat: "35.6764",
      lon: "139.6500",
    },
    {
      id: 3,
      title: "Bali, Indonesia",
      image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=600&auto=format&fit=crop",
      rating: "4.7",
      liked: false,
      lat: "-8.409518",
      lon: "115.188919",
    },
    {
      id: 4,
      title: "New York, USA",
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=600&auto=format&fit=crop",
      rating: "4.9",
      liked: true,
      lat: "40.7128",
      lon: "-74.0060",
    },
  ];

  const themeStyles = {
    backgroundColor: isDark ? "#121212" : "#F8F9FA",
    textColor: isDark ? "#FFFFFF" : "#1A1A1A",
    subTextColor: isDark ? "#A0A0A0" : "#666666",
    cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
    borderColor: isDark ? "#2C2C2C" : "#E2E8F0",
  };

  // Instant 1-Click AI Generation
  const executeAiTrip = async (destination, days = 3, budget = "Moderate", fallbackImage = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiLoading(true);
    setAiError(null);
    setAiStep(1);

    // Step progression animation timer
    const stepTimer1 = setTimeout(() => setAiStep(2), 1400);
    const stepTimer2 = setTimeout(() => setAiStep(3), 2800);

    try {
      console.log("[AI-Copilot] Generating instant trip for:", destination);
      const result = await generateTripWithAgent({
        destination: destination,
        days: days,
        budget: budget
      });

      const responseText = await result.response.text();
      let cleanResponse = responseText.trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanResponse = jsonMatch[0];

      const parsedData = JSON.parse(cleanResponse);
      const completePlan = parsedData.trip || parsedData;

      const completeTripData = {
        toLocation: { name: destination, coordinates: { lat: 0, lng: 0 } },
        toLocationImage: fallbackImage || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1000&auto=format&fit=crop",
        budget: budget,
        duration: `${days} Days`,
        aiTripPlan: completePlan
      };

      setTripData(completeTripData);
      setAiLoading(false);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      router.push("/(tabs)/mytrip");
    } catch (err) {
      console.error("[AI-Copilot] Generation error:", err);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAiLoading(false);
      setAiError(err.message || "Failed to generate AI trip. Please try again.");
    }
  };

  // Parse natural language from AI prompt box
  const handleCustomAiPrompt = () => {
    if (!aiPrompt.trim()) return;

    const lower = aiPrompt.toLowerCase();
    
    // Extract days if typed (e.g. 4 days)
    const daysMatch = lower.match(/(\d+)\s*day/);
    const days = daysMatch ? parseInt(daysMatch[1]) : 3;

    // Extract budget hint
    let budget = "Moderate";
    if (lower.includes("luxury") || lower.includes("expensive")) budget = "Luxury";
    else if (lower.includes("cheap") || lower.includes("budget") || lower.includes("economical")) budget = "Economical";

    // Clean destination
    let dest = aiPrompt
      .replace(/plan/gi, "")
      .replace(/a trip/gi, "")
      .replace(/trip to/gi, "")
      .replace(/trip/gi, "")
      .replace(/\d+\s*days?/gi, "")
      .replace(/for/gi, "")
      .replace(/in/gi, "")
      .replace(/on a budget/gi, "")
      .replace(/luxury/gi, "")
      .trim();

    if (!dest) dest = aiPrompt.trim();

    executeAiTrip(dest, days, budget);
  };

  const searchPlace = (text) => {
    setSearchQuery(text);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (text.length < 3) {
        setResults([]);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${text}&addressdetails=1&accept-language=en`,
          {
            headers: {
              "User-Agent": "TripPlannerApp/1.0",
            },
          }
        );
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.log("Search error:", error);
      }
    }, 500);
  };

  const selectPlace = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const place = {
      name: item.display_name,
      coordinates: { lat: item.lat, lng: item.lon },
    };

    setTripData((prev) => ({
      ...prev,
      toLocation: place,
      toLocationImage: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1000&auto=format&fit=crop", 
      toLocationRating: "4.8",
      fromLocation: { name: "Current Location", coordinates: { lat: 0, lng: 0 } },
    }));

    setSearchQuery("");
    setResults([]);
    router.push("/create-trip/trip-summer");
  };

  const selectPopularDestination = (dest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const place = {
      name: dest.title,
      coordinates: { lat: dest.lat, lng: dest.lon },
    };

    setTripData((prev) => ({
      ...prev,
      toLocation: place,
      toLocationImage: dest.image,
      toLocationRating: dest.rating,
      fromLocation: { name: "Current Location", coordinates: { lat: 0, lng: 0 } },
    }));
    
    router.push("/create-trip/trip-summer");
  };

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.backgroundColor }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeStyles.textColor }]}>Discover</Text>
          <Text style={[styles.subtitle, { color: themeStyles.subTextColor }]}>
            Explore the world with AI
          </Text>
        </View>

        {/* 🌟 AI MAGIC COMMAND BAR (Top-tier Hero Card) */}
        <View style={[styles.aiHeroCard, { backgroundColor: isDark ? "#1A1528" : "#F5F3FF", borderColor: isDark ? "#6D28D9" : "#DDD6FE" }]}>
          <View style={styles.aiBadgeRow}>
            <View style={styles.aiGlowBadge}>
              <MaterialCommunityIcons name="creation" size={14} color="#8B5CF6" />
              <Text style={styles.aiGlowBadgeText}>AI TRAVEL COPILOT</Text>
            </View>
            <Text style={styles.aiStatusDot}>• Ready</Text>
          </View>

          <Text style={[styles.aiHeroTitle, { color: themeStyles.textColor }]}>
            Where should AI take you today? ✨
          </Text>
          <Text style={[styles.aiHeroSub, { color: themeStyles.subTextColor }]}>
            Type any destination or tap a vibe card to plan instantly
          </Text>

          {/* AI Magic Prompt Input */}
          <View style={[styles.aiInputBox, { backgroundColor: isDark ? "#241D3B" : "#FFFFFF" }]}>
            <TextInput
              style={[styles.aiTextInput, { color: themeStyles.textColor }]}
              placeholder="e.g. 4 days in Tokyo for sushi & anime..."
              placeholderTextColor={themeStyles.subTextColor}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              onSubmitEditing={handleCustomAiPrompt}
              returnKeyType="go"
            />
            <TouchableOpacity 
              style={styles.aiSendBtn} 
              onPress={handleCustomAiPrompt}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="sparkles" size={16} color="#FFF" />
              <Text style={styles.aiSendBtnText}>Plan</Text>
            </TouchableOpacity>
          </View>

          {/* Quick-Vibe Prompt Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vibeScroll}>
            {QUICK_AI_VIBES.map((vibe) => (
              <TouchableOpacity
                key={vibe.id}
                style={[styles.vibeCard, { backgroundColor: isDark ? "#251F3A" : "#FFFFFF", borderColor: vibe.color + "40" }]}
                onPress={() => executeAiTrip(vibe.destination, vibe.days, vibe.budget, vibe.image)}
                activeOpacity={0.85}
              >
                <View style={[styles.vibeIconCircle, { backgroundColor: vibe.color + "18" }]}>
                  <Ionicons name={vibe.icon} size={15} color={vibe.color} />
                </View>
                <Text style={[styles.vibeCardTitle, { color: themeStyles.textColor }]} numberOfLines={1}>{vibe.title}</Text>
                <Text style={[styles.vibeCardTag, { color: vibe.color }]}>{vibe.tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Regular Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}>
          <Ionicons name="search" size={20} color={themeStyles.subTextColor} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: themeStyles.textColor }]}
            placeholder="Search specific city (e.g. London, Cairo)..."
            placeholderTextColor={themeStyles.subTextColor}
            value={searchQuery}
            onChangeText={searchPlace}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); setResults([]); }}>
              <Ionicons name="close-circle" size={18} color={themeStyles.subTextColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {results.length > 0 && (
          <View style={[styles.searchResultsContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}>
            {results.slice(0, 5).map((item, index) => (
              <TouchableOpacity
                key={item.place_id || index}
                onPress={() => selectPlace(item)}
                style={[
                  styles.resultItem,
                  index < results.length - 1 && { borderBottomColor: themeStyles.borderColor, borderBottomWidth: 1 }
                ]}
              >
                <Ionicons name="location" size={16} color={Colors.PRIMARY} style={{ marginRight: 10 }} />
                <Text style={[{ color: themeStyles.textColor, flex: 1 }]} numberOfLines={2}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Categories Section */}
        {results.length === 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeStyles.textColor }]}>Categories</Text>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/explore");
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: Colors.PRIMARY, fontFamily: "Outfit-Medium" }}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.categoriesContainer}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {categories.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.categoryCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const route = item.title.toLowerCase();
                    if (['beaches', 'mountains', 'forest'].includes(route)) {
                      router.push(`/${route}`);
                    } else {
                      executeAiTrip(item.title, 3, "Moderate");
                    }
                  }}
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: Colors.PRIMARY + '12' }]}>
                    <Ionicons name={item.icon} size={22} color={Colors.PRIMARY} />
                  </View>
                  <Text style={[styles.categoryText, { color: themeStyles.textColor }]}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Popular Destinations */}
            <View style={[styles.sectionHeader, { marginTop: 25 }]}>
              <Text style={[styles.sectionTitle, { color: themeStyles.textColor }]}>Trending Places</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/explore");
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: Colors.PRIMARY, fontFamily: "Outfit-Medium" }}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {popularDestinations.map((dest) => (
                <TouchableOpacity
                  key={dest.id}
                  style={[styles.popularCard, { backgroundColor: themeStyles.cardBg }]}
                  onPress={() => selectPopularDestination(dest)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: dest.image }} style={styles.popularImage} />
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{dest.rating}</Text>
                  </View>
                  <View style={styles.popularInfo}>
                    <Text style={[styles.popularTitle, { color: themeStyles.textColor }]} numberOfLines={1}>{dest.title}</Text>
                    <View style={styles.popularActionRow}>
                      <Text style={[styles.popularExplore, { color: Colors.PRIMARY }]}>1-Tap AI Plan ⚡</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

      </ScrollView>

      {/* 🔮 LIVE AI THINKING STREAM MODAL */}
      <Modal visible={aiLoading} transparent={true} animationType="fade">
        <View style={styles.aiModalOverlay}>
          <View style={[styles.aiModalContent, { backgroundColor: isDark ? "#1E1833" : "#FFFFFF" }]}>
            <View style={styles.aiPulseCircle}>
              <MaterialCommunityIcons name="creation" size={32} color="#8B5CF6" />
            </View>

            <Text style={[styles.aiModalTitle, { color: themeStyles.textColor }]}>
              AI Copilot at Work ✨
            </Text>
            <Text style={[styles.aiModalSub, { color: themeStyles.subTextColor }]}>
              Crafting your seamless, personalized itinerary
            </Text>

            {/* Thinking Progress Steps */}
            <View style={styles.aiStepsBox}>
              <View style={styles.aiStepItem}>
                <Ionicons 
                  name={aiStep >= 1 ? "checkmark-circle" : "ellipse-outline"} 
                  size={18} 
                  color={aiStep >= 1 ? "#10B981" : "#A0A0A0"} 
                />
                <Text style={[styles.aiStepText, { color: aiStep >= 1 ? themeStyles.textColor : themeStyles.subTextColor }]}>
                  Analyzing destination & climate
                </Text>
              </View>

              <View style={styles.aiStepItem}>
                <Ionicons 
                  name={aiStep >= 2 ? "checkmark-circle" : aiStep === 1 ? "sync-outline" : "ellipse-outline"} 
                  size={18} 
                  color={aiStep >= 2 ? "#10B981" : aiStep === 1 ? "#8B5CF6" : "#A0A0A0"} 
                />
                <Text style={[styles.aiStepText, { color: aiStep >= 2 ? themeStyles.textColor : themeStyles.subTextColor }]}>
                  Curating top boutique stays & dining
                </Text>
              </View>

              <View style={styles.aiStepItem}>
                <Ionicons 
                  name={aiStep >= 3 ? "checkmark-circle" : "sync-outline"} 
                  size={18} 
                  color={aiStep >= 3 ? "#10B981" : "#8B5CF6"} 
                />
                <Text style={[styles.aiStepText, { color: aiStep >= 3 ? themeStyles.textColor : themeStyles.subTextColor }]}>
                  Structuring morning-to-night itinerary
                </Text>
              </View>
            </View>

            <ActivityIndicator size="small" color="#8B5CF6" style={{ marginTop: 15 }} />
          </View>
        </View>
      </Modal>

      {/* Error Alert Modal if generation fails */}
      {aiError && (
        <Modal visible={!!aiError} transparent={true} animationType="fade">
          <View style={styles.aiModalOverlay}>
            <View style={[styles.aiModalContent, { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" }]}>
              <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
              <Text style={[styles.aiModalTitle, { color: themeStyles.textColor, marginTop: 10 }]}>Oops!</Text>
              <Text style={[styles.aiModalSub, { color: themeStyles.subTextColor }]}>{aiError}</Text>
              <TouchableOpacity 
                style={[styles.aiSendBtn, { width: "100%", marginTop: 15, paddingVertical: 12 }]}
                onPress={() => setAiError(null)}
              >
                <Text style={styles.aiSendBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 45 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 50 },
  header: { marginBottom: 15 },
  title: { fontSize: 28, fontFamily: "Outfit-Bold" },
  subtitle: { fontSize: 14, fontFamily: "Outfit-Medium", marginTop: 2 },

  // AI Hero Card
  aiHeroCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 20,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  aiBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  aiGlowBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiGlowBadgeText: { color: "#8B5CF6", fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 4, letterSpacing: 0.5 },
  aiStatusDot: { color: "#10B981", fontSize: 12, fontFamily: "Outfit-Bold" },
  aiHeroTitle: { fontSize: 20, fontFamily: "Outfit-Bold", marginBottom: 4 },
  aiHeroSub: { fontSize: 12, fontFamily: "Outfit-Regular", marginBottom: 14 },

  aiInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  aiTextInput: { flex: 1, fontSize: 13, fontFamily: "Outfit-Regular", paddingVertical: 8 },
  aiSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiSendBtnText: { color: "#FFF", fontSize: 12, fontFamily: "Outfit-Bold", marginLeft: 4 },

  vibeScroll: { flexDirection: "row" },
  vibeCard: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    marginRight: 10,
    width: 145,
  },
  vibeIconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  vibeCardTitle: { fontSize: 13, fontFamily: "Outfit-Bold", marginBottom: 2 },
  vibeCardTag: { fontSize: 10, fontFamily: "Outfit-Bold" },

  // Regular Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 15,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Outfit-Regular" },

  searchResultsContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
  },
  resultItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },

  // Categories
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 10 },
  sectionTitle: { fontSize: 18, fontFamily: "Outfit-Bold" },
  categoriesContainer: { marginTop: 6 },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },
  categoryIconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", marginRight: 8 },
  categoryText: { fontSize: 13, fontFamily: "Outfit-Medium" },

  // Trending Places
  popularCard: {
    width: 200,
    borderRadius: 20,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  popularImage: { width: "100%", height: 130 },
  ratingBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ratingText: { color: "#FFF", fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 3 },
  popularInfo: { padding: 12 },
  popularTitle: { fontSize: 15, fontFamily: "Outfit-Bold", marginBottom: 4 },
  popularActionRow: { flexDirection: "row", alignItems: "center" },
  popularExplore: { fontSize: 12, fontFamily: "Outfit-Bold" },

  // AI Thinking Stream Modal
  aiModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  aiModalContent: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  aiPulseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  aiModalTitle: { fontSize: 20, fontFamily: "Outfit-Bold" },
  aiModalSub: { fontSize: 13, fontFamily: "Outfit-Regular", textAlign: "center", marginTop: 4, marginBottom: 20 },
  aiStepsBox: { width: "100%", gap: 12 },
  aiStepItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiStepText: { fontSize: 13, fontFamily: "Outfit-Medium" },
});
