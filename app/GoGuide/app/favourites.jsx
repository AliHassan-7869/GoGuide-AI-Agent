import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../Components/constants/constants";
import { Radius, Spacing, Typography, useTheme } from "../Components/constants/theme";
import EmptyState from "../Components/ui/EmptyState";
import FadeInView from "../Components/ui/FadeInView";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { SkeletonCard } from "../Components/ui/Skeleton";
import { TouchableOpacity } from "../Components/ui/Touchable";
import {
  getFavoritePlaces,
  subscribeToFavorites,
  toggleFavoritePlace,
} from "../Components/utils/FavoriteService";
import { selectHaptic, tapHaptic } from "../Components/utils/haptics";
import { CreateTripContext } from "../context/CreateTripContext";

import { goBack } from "../Components/utils/navigation";
export default function Favourites() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { setTripData } = useContext(CreateTripContext);

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  const retry = () => {
    setLoading(true);
    setError(false);
    setReloadKey((k) => k + 1);
  };

  // Load and listen for changes
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const places = await getFavoritePlaces();
        if (isMounted) setFavorites(places);
      } catch (_e) {
        if (isMounted) setError(true);
      } finally {
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
  }, [reloadKey]);

  const handleRemove = async (place) => {
    selectHaptic();
    try {
      await toggleFavoritePlace(place);
      const updated = await getFavoritePlaces();
      setFavorites(updated);
    } catch (e) {
      console.warn("Could not remove favorite:", e);
    }
  };

  const handlePlanTrip = (place) => {
    tapHaptic();
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
        subtitle="Your saved destinations"
        badgeText={favorites.length}
        onBack={() => goBack(router)}
      />

      {loading ? (
        <View style={styles.scrollContent} accessibilityLabel="Loading your favourites">
          <SkeletonCard imageHeight={150} style={styles.card} />
          <SkeletonCard imageHeight={150} style={styles.card} />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load favourites"
          text="Please check your connection and try again."
          actionLabel="Try again"
          onAction={retry}
        />
      ) : favorites.length === 0 ? (
        <ScrollView
          contentContainerStyle={[styles.emptyContainer, { paddingBottom: insets.bottom + 84 }]}
          showsVerticalScrollIndicator={false}
        >
          <EmptyState
            icon="heart-outline"
            title="No Favourites Yet"
            text="Browse top rated destinations, beaches & mountain retreats to save them to your personal travel wishlist."
            actionLabel="Discover Destinations"
            onAction={() => router.push("/explore")}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 84 }]}
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
              <FadeInView
                key={place.id || `fav_${idx}`}
                index={idx}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.cardHero}>
                  <Image source={{ uri: imageUri }} style={styles.cardImage} accessibilityLabel={title} />
                  <View style={styles.cardImageOverlay} />

                  <View style={styles.heroTopBadges}>
                    <View style={styles.categoryPill}>
                      <Ionicons name="location-outline" size={12} color="#FFFFFF" />
                      <Text style={styles.categoryPillText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                        {categoryLabel}
                      </Text>
                    </View>

                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${title} from favourites`}
                      onPress={() => handleRemove(place)}
                      style={styles.heartButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="heart" size={20} color={Colors.DANGER || "#EF4444"} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.heroBottomRow}>
                    <Text style={styles.heroTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {title}
                    </Text>
                    <View style={styles.ratingBadge} accessible accessibilityLabel={`Rating ${rating}`}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingText} maxFontSizeMultiplier={1.3}>{rating}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Plan AI trip to ${title}`}
                    style={[styles.primaryActionBtn, { backgroundColor: activeAccent }]}
                    onPress={() => handlePlanTrip(place)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={15} color="#FFFFFF" style={styles.btnIcon} />
                    <Text style={styles.primaryActionBtnText} maxFontSizeMultiplier={1.3}>Plan AI Trip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Explore destinations"
                    style={[styles.secondaryActionBtn, { borderColor: activeAccent }]}
                    onPress={() => router.push("/explore")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="compass-outline" size={15} color={activeAccent} style={styles.btnIcon} />
                    <Text style={[styles.secondaryActionBtnText, { color: activeAccent }]} maxFontSizeMultiplier={1.3}>
                      Explore
                    </Text>
                  </TouchableOpacity>
                </View>
              </FadeInView>
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
  scrollContent: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  cardHero: {
    minHeight: 150,
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
    maxWidth: "70%",
    flexShrink: 1,
  },
  categoryPillText: {
    fontSize: Typography.sizeXs,
    color: "#FFFFFF",
    fontFamily: Typography.fontMedium,
  },
  heartButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  heroBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  heroTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: Typography.sizeLg,
    fontFamily: Typography.fontBold,
    color: "#FFFFFF",
    marginRight: 6,
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
    minHeight: 44,
    paddingVertical: Spacing.sm,
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
    minHeight: 44,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontMedium,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  btnIcon: {
    marginRight: 6,
  },
});
