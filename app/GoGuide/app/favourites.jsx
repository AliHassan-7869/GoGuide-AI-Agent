import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../Components/constants/constants";
import { Radius, Spacing, Typography, useTheme } from "../Components/constants/theme";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { TouchableOpacity } from "../Components/ui/Touchable";
import {
  getFavoritePlaces,
  subscribeToFavorites,
  toggleFavoritePlace,
} from "../Components/utils/FavoriteService";
import { CreateTripContext } from "../context/CreateTripContext";

export default function Favourites() {
  const router = useRouter();
  const theme = useTheme();
  const { setTripData } = useContext(CreateTripContext);

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  // Load and listen for changes
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const places = await getFavoritePlaces();
        if (isMounted) {
          setFavorites(places);
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) setLoading(false);
      }
    })();

    const unsubscribe = subscribeToFavorites((updated) => {
      if (isMounted) setFavorites(updated);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleRemove = async (place) => {
    try {
      await toggleFavoritePlace(place);
      const updated = await getFavoritePlaces();
      setFavorites(updated);
    } catch (e) {
      console.warn("Could not remove favorite:", e);
    }
  };

  const handlePlanTrip = (place) => {
    if (setTripData) {
      setTripData((prev) => ({
        ...prev,
        toLocation: {
          name: place.name || place.title,
          coordinates: { lat: place.lat || 0, lng: place.lon || 0 },
        },
        toLocationImage: place.image,
        toLocationRating: place.rating,
        fromLocation: { name: "Current Location", coordinates: null },
      }));
    }
    router.push("/create-trip/trip-summer");
  };

  const formatCategory = (cat) => {
    if (!cat) return "Destination";
    const cleaned = String(cat).trim().toLowerCase();
    const map = {
      cities: "Cities",
      city: "Cities",
      beaches: "Beaches",
      beach: "Beaches",
      mountains: "Mountains",
      mountain: "Mountains",
      forest: "Forest",
      forests: "Forest",
      camping: "Camping",
    };
    return map[cleaned] || (cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Golden Reference ScreenHeader */}
      <ScreenHeader
        title="Favourites"
        subtitle="Your saved destinations & wishlist"
        badgeText={favorites.length}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={activeAccent} />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>
            Loading your favourites...
          </Text>
        </View>
      ) : favorites.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: theme.isDark
                  ? "rgba(10, 126, 164, 0.16)"
                  : "rgba(10, 126, 164, 0.1)",
              },
            ]}
          >
            <Ionicons name="heart-outline" size={36} color={activeAccent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No Favourites Yet
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.subtext }]}>
            Browse top rated destinations, beaches & mountain retreats to save
            them to your personal travel wishlist.
          </Text>
          <TouchableOpacity
            style={[styles.exploreBtn, { backgroundColor: activeAccent }]}
            onPress={() => router.push("/explore")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="compass-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.exploreBtnText}>Discover Destinations</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {favorites.map((place, idx) => {
            const title = place.name || place.title || "Scenic Escape";
            const categoryLabel = formatCategory(place.category);
            const rating = place.rating || "4.8";
            const imageUri =
              place.image ||
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop";

            return (
              <View
                key={place.id || `fav_${idx}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Hero Banner with Overlay */}
                <View style={styles.cardHero}>
                  <Image source={{ uri: imageUri }} style={styles.cardImage} />
                  <View style={styles.cardImageOverlay} />

                  {/* Top Badges: Category & Unlike Action */}
                  <View style={styles.heroTopBadges}>
                    <View style={styles.categoryPill}>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color="#FFFFFF"
                      />
                      <Text style={styles.categoryPillText}>
                        {categoryLabel}
                      </Text>
                    </View>

                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Remove from favourites"
                      onPress={() => handleRemove(place)}
                      style={styles.heartButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="heart" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Bottom Hero Info: Title & Rating */}
                  <View style={styles.heroBottomRow}>
                    <Text
                      style={styles.heroTitle}
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingText}>{rating}</Text>
                    </View>
                  </View>
                </View>

                {/* Card Action Buttons (Matching Golden Reference) */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: activeAccent }]}
                    onPress={() => handlePlanTrip(place)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="sparkles"
                      size={15}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.primaryActionBtnText}>Plan AI Trip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.secondaryActionBtn,
                      {
                        backgroundColor: theme.isDark ? "#20202F" : "#F1F5F9",
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => router.push("/explore")}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="compass-outline"
                      size={15}
                      color={theme.text}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[styles.secondaryActionBtnText, { color: theme.text }]}
                    >
                      Explore
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontRegular,
  },
  scrollContent: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardHero: {
    height: 150,
    position: "relative",
    justifyContent: "space-between",
    padding: 12,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  heroTopBadges: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  categoryPillText: {
    fontSize: Typography.sizeXs,
    color: "#FFFFFF",
    fontFamily: Typography.fontMedium,
  },
  heartButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 8,
  },
  heroTitle: {
    flex: 1,
    fontSize: Typography.sizeLg,
    fontFamily: Typography.fontBold,
    color: "#FFFFFF",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  ratingText: {
    fontSize: Typography.sizeXs,
    color: "#FFFFFF",
    fontFamily: Typography.fontBold,
  },
  cardActionsRow: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontBold,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontMedium,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: Typography.sizeLg,
    fontFamily: Typography.fontBold,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontRegular,
    textAlign: "center",
    lineHeight: 20,
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    marginTop: 8,
  },
  exploreBtnText: {
    color: "#FFFFFF",
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontBold,
  },
});

