import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import React, { useContext, useState, useRef } from "react";
import { Colors } from "../../Components/constants/constants";
import { CreateTripContext } from "../../context/CreateTripContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import PackingList from "../../Components/MyTrips/PackingList";

export default function Discover() {
  const router = useRouter();
  const { preferences, setTripData } = useContext(CreateTripContext);
  const isDark = preferences?.darkMode;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const timeoutRef = useRef(null);

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
    borderColor: isDark ? "#2C2C2C" : "#E0E0E0",
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
    const placeName = item.display_name.split(',')[0];
    const place = {
      name: item.display_name,
      coordinates: {
        lat: item.lat,
        lng: item.lon,
      },
    };

    setTripData((prev) => ({
      ...prev,
      toLocation: place,
      toLocationImage: `https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1000&auto=format&fit=crop`, 
      toLocationRating: (4.5 + Math.random() * 0.5).toFixed(1),
      fromLocation: { name: "Current Location", coordinates: { lat: 0, lng: 0 } },
    }));

    setSearchQuery("");
    setResults([]);
    // Navigate to Detail View first!
    router.push("/create-trip/trip-summer");
  };

  const selectPopularDestination = (dest) => {
    const place = {
      name: dest.title,
      coordinates: {
        lat: dest.lat,
        lng: dest.lon,
      },
    };

    setTripData((prev) => ({
      ...prev,
      toLocation: place,
      toLocationImage: dest.image, // Pass image for detail view
      toLocationRating: dest.rating, // Pass rating for detail view
      fromLocation: { name: "Current Location", coordinates: { lat: 0, lng: 0 } },
    }));
    
    router.push("/create-trip/trip-summer");
  };

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.backgroundColor }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeStyles.textColor }]}>Discover</Text>
          <Text style={[styles.subtitle, { color: themeStyles.subTextColor }]}>
            Find your next adventure
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}>
          <Ionicons name="search" size={20} color={themeStyles.subTextColor} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: themeStyles.textColor }]}
            placeholder="Where do you want to go?"
            placeholderTextColor={themeStyles.subTextColor}
            value={searchQuery}
            onChangeText={searchPlace}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Results Dropdown-style */}
        {results.length > 0 && (
          <View style={[styles.searchResultsContainer, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}>
            {results.slice(0, 5).map((item, index) => (
              <TouchableOpacity
                key={item.place_id}
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
              <TouchableOpacity>
                <Text style={{ color: Colors.PRIMARY, fontFamily: "Outfit-Medium" }}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.categoriesContainer}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {categories.map((item, index) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.categoryCard, { backgroundColor: themeStyles.cardBg, borderColor: themeStyles.borderColor }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const route = item.title.toLowerCase();
                    if (['beaches', 'mountains', 'forest'].includes(route)) {
                      router.push(`/${route}`);
                    } else {
                      alert(`${item.title} category coming soon!`);
                    }
                  }}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${Colors.PRIMARY}20` }]}>
                    <Ionicons name={item.icon} size={20} color={Colors.PRIMARY} />
                  </View>
                  <Text style={[styles.categoryText, { color: themeStyles.textColor }]}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Safety Alerts Banner */}
            <TouchableOpacity 
              style={[styles.safetyBanner, { backgroundColor: isDark ? "#2A1B1B" : "#FFF5F5" }]}
              activeOpacity={0.9}
              onPress={() => router.push("/safety-alerts")}
            >
              <View style={[styles.safetyIconContainer, { backgroundColor: "#FF4B4B" }]}>
                <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.safetyTextContainer}>
                <Text style={[styles.safetyTitle, { color: themeStyles.textColor }]}>Travel Safety Alerts</Text>
                <Text style={[styles.safetySub, { color: themeStyles.subTextColor }]}>Check live advisories for your destination</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeStyles.subTextColor} />
            </TouchableOpacity>

            {/* Popular Destinations */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeStyles.textColor }]}>Popular Destinations</Text>
            </View>

            <View style={styles.destinationsContainer}>
              {popularDestinations.map((destination) => (
                <TouchableOpacity 
                  key={destination.id} 
                  style={[styles.destinationCard, { backgroundColor: themeStyles.cardBg }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    selectPopularDestination(destination);
                  }}
                >
                  <Image source={{ uri: destination.image }} style={styles.cardImage} />
                  <TouchableOpacity style={styles.heartButton}>
                    <Ionicons 
                      name={destination.liked ? "heart" : "heart-outline"} 
                      size={20} 
                      color={destination.liked ? "#FF4B4B" : "#FFFFFF"} 
                    />
                  </TouchableOpacity>
                  
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: themeStyles.textColor }]} numberOfLines={1}>
                      {destination.title}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={[styles.ratingText, { color: themeStyles.subTextColor }]}>
                        {" "}{destination.rating}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* General Travel Essentials */}
            <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
              <PackingList />
            </View>
          </>
        )}
        
        {/* Bottom spacer for tabs */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontFamily: "Outfit-Bold",
    fontSize: 28,
  },
  subtitle: {
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 10, // Reduced to merge with results visually
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    paddingVertical: 5,
  },
  filterBtn: {
    backgroundColor: Colors.PRIMARY || "#000",
    padding: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  searchResultsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    borderWidth: 1,
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: 15,
  },
  sectionTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 18,
  },
  categoriesContainer: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  categoryCard: {
    alignItems: "center",
    marginRight: 15,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    width: 90,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryText: {
    fontFamily: "Outfit-Medium",
    fontSize: 12,
  },
  destinationsContainer: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  destinationCard: {
    width: "48%",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 140,
  },
  heartButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 6,
    borderRadius: 20,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 14,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontFamily: "Outfit-Regular",
    fontSize: 12,
  },
  safetyBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    marginTop: 5,
  },
  safetyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  safetyTextContainer: {
    flex: 1,
  },
  safetyTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 16,
  },
  safetySub: {
    fontFamily: "Outfit-Regular",
    fontSize: 12,
    marginTop: 2,
  },
});
