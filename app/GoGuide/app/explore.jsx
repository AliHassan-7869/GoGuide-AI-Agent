import { View, Text, StyleSheet, FlatList, Image, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useContext, useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CreateTripContext } from '../context/CreateTripContext';
import { Colors } from '../Components/constants/constants';
import { useTheme } from '../Components/constants/theme';
import ScreenHeader from '../Components/ui/ScreenHeader';
import {
  DESTINATIONS,
  DESTINATION_CATEGORIES,
  DEFAULT_HD_TRAVEL_IMAGE,
  sanitizeImageUrl,
} from '../Components/constants/Destinations';
import Ionicons from '@expo/vector-icons/Ionicons';
import FavoriteHeartButton from '../Components/FavoriteHeartButton';

import { TouchableOpacity } from "../Components/ui/Touchable";
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
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { category } = useLocalSearchParams();
  const { preferences, setTripData } = useContext(CreateTripContext);
  const isDark = preferences?.darkMode;
  const activeAccent = Colors.PRIMARY || "#0F172A";

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

  const selectDestination = (dest) => {
    setTripData((prev) => ({
      ...prev,
      toLocation: {
        name: dest.title,
        coordinates: { lat: dest.lat, lng: dest.lon },
      },
      toLocationImage: dest.image,
      toLocationRating: dest.rating,
      fromLocation: { name: "Current Location", coordinates: null },
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
          ? { backgroundColor: activeAccent, borderColor: activeAccent }
          : { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Ionicons name={icon} size={15} color={active ? "#FFFFFF" : theme.text} />
      <Text style={[styles.chipText, { color: active ? "#FFFFFF" : theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header matching golden reference */}
      <ScreenHeader
        title={activeInfo?.title || "Explore"}
        subtitle="Handpicked destinations & top-rated sights"
        onBack={() => router.back()}
      />

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
          <View style={[styles.chipDivider, { backgroundColor: theme.border }]} />
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
        contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.subtext }]}>No places in this category yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ position: "relative" }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => selectDestination(item)}
              >
                <DestinationImage uri={item.image} style={styles.image} />
              </TouchableOpacity>
              {item.category ? (
                <View style={styles.categoryBadge} pointerEvents="none">
                  <Text style={styles.categoryBadgeText} numberOfLines={1}>
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </Text>
                </View>
              ) : null}
              <FavoriteHeartButton
                item={{
                  id: item.id || item.title,
                  name: item.title,
                  title: item.title,
                  image: item.image,
                  category: item.category || "Explore",
                  rating: item.rating || "4.8",
                }}
              />
            </View>
            <TouchableOpacity
              style={styles.infoContainer}
              activeOpacity={0.9}
              onPress={() => selectDestination(item)}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={15} color="#FFD700" />
                <Text style={[styles.ratingText, { color: theme.subtext }]}>{item.rating}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontFamily: "Outfit-Medium",
    fontSize: 13,
    marginLeft: 6,
  },
  chipDivider: {
    width: 1,
    height: 22,
    marginRight: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 32,
  },
  emptyText: {
    fontFamily: "Outfit-Medium",
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  image: {
    width: "100%",
    height: 190,
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    maxWidth: "65%",
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontFamily: "Outfit-Bold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  infoContainer: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontFamily: "Outfit-Bold",
    fontSize: 13,
    marginLeft: 4,
  },
});
