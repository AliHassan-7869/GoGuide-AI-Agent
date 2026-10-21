import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Platform, ScrollView } from 'react-native';
import React, { useContext, useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CreateTripContext } from '../context/CreateTripContext';
import { Colors } from '../Components/constants/constants';
import {
  DESTINATIONS,
  DESTINATION_CATEGORIES,
  DEFAULT_HD_TRAVEL_IMAGE,
  sanitizeImageUrl,
} from '../Components/constants/Destinations';
import Ionicons from '@expo/vector-icons/Ionicons';

const isKnownCategory = (id) => DESTINATION_CATEGORIES.some((c) => c.id === id);

function DestinationImage({ uri, style }) {
  const [sourceUri, setSourceUri] = useState(() => sanitizeImageUrl(uri));
  return (
    <Image
      source={{ uri: sourceUri }}
      style={style}
      onError={() => setSourceUri(DEFAULT_HD_TRAVEL_IMAGE)}
    />
  );
}

export default function Explore() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const { preferences, setTripData } = useContext(CreateTripContext);
  const isDark = preferences?.darkMode;

  const [activeCategory, setActiveCategory] = useState(isKnownCategory(category) ? category : "all");
  const [topRatedFirst, setTopRatedFirst] = useState(false);

  const activeInfo = DESTINATION_CATEGORIES.find((c) => c.id === activeCategory);

  const visibleDestinations = useMemo(() => {
    const filtered = activeCategory === "all"
      ? DESTINATIONS
      : DESTINATIONS.filter((d) => d.category === activeCategory);
    if (!topRatedFirst) return filtered;
    return [...filtered].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
  }, [activeCategory, topRatedFirst]);

  const themeStyles = {
    backgroundColor: isDark ? "#121212" : "#F8F9FA",
    textColor: isDark ? "#FFFFFF" : "#1A1A1A",
    subTextColor: isDark ? "#A0A0A0" : "#666666",
    cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
    chipBg: isDark ? "#1E1E1E" : "#FFFFFF",
    chipBorder: isDark ? "#333333" : "#E0E0E0",
  };

  const selectDestination = (dest) => {
    setTripData((prev) => ({
      ...prev,
      toLocation: {
        name: dest.title,
        coordinates: { lat: dest.lat, lng: dest.lon },
      },
      toLocationImage: dest.image,
      toLocationRating: dest.rating,
      fromLocation: { name: "Current Location", coordinates: { lat: 0, lng: 0 } },
    }));
    router.push("/create-trip/trip-summer");
  };

  const renderChip = ({ id, label, icon, active, onPress }) => (
    <TouchableOpacity
      key={id}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.chip,
        active
          ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
          : { backgroundColor: themeStyles.chipBg, borderColor: themeStyles.chipBorder },
      ]}
    >
      <Ionicons name={icon} size={16} color={active ? "#FFFFFF" : themeStyles.textColor} />
      <Text style={[styles.chipText, { color: active ? "#FFFFFF" : themeStyles.textColor }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeStyles.textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeStyles.textColor }]}>{activeInfo?.title}</Text>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {DESTINATION_CATEGORIES.map((c) =>
            renderChip({
              id: c.id,
              label: c.label,
              icon: c.icon,
              active: activeCategory === c.id,
              onPress: () => setActiveCategory(c.id),
            })
          )}
          <View style={[styles.chipDivider, { backgroundColor: themeStyles.chipBorder }]} />
          {renderChip({
            id: "top-rated",
            label: "Top rated",
            icon: "star-outline",
            active: topRatedFirst,
            onPress: () => setTopRatedFirst((v) => !v),
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visibleDestinations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: themeStyles.subTextColor }]}>No places in this category yet.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: themeStyles.cardBg }]}
            onPress={() => selectDestination(item)}
            activeOpacity={0.8}
          >
            <DestinationImage uri={item.image} style={styles.image} />
            <View style={styles.infoContainer}>
              <Text style={[styles.cardTitle, { color: themeStyles.textColor }]}>{item.title}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={[styles.ratingText, { color: themeStyles.subTextColor }]}>{item.rating}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontFamily: "Outfit-Bold",
    fontSize: 24,
  },
  chipRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontFamily: "Outfit-Medium",
    fontSize: 14,
    marginLeft: 6,
  },
  chipDivider: {
    width: 1,
    height: 24,
    marginRight: 8,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyText: {
    fontFamily: "Outfit-Medium",
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: "100%",
    height: 200,
  },
  infoContainer: {
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontFamily: "Outfit-Medium",
    fontSize: 14,
    marginLeft: 5,
  },
});
