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
import { Radius, Spacing, Typography, useTheme, Palette } from "../Components/constants/theme";
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
import { formatRating } from "../Components/utils/rating";
import { FALLBACK_FAVORITE_IMAGE, cleanFavorites, prettyLabel, safeImageUri } from "../Components/utils/favoritesNormalize";

/** Destination photo that falls back to a default picture if the link is dead, so a card is never blank. */
function FavoriteImage({ uri, label }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={{ uri: failed ? FALLBACK_FAVORITE_IMAGE : safeImageUri(uri) }}
      style={styles.cardImage}
      resizeMode="cover"
      accessibilityLabel={label}
      onError={() => setFailed(true)}
    />
  );
}
export default function Favourites() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { setTripData } = useContext(CreateTripContext);

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const activeAccent = Colors.PRIMARY || Palette.brand;

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
        if (isMounted) setFavorites(cleanFavorites(places));
      } catch (_e) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    const unsubscribe = subscribeToFavorites((updated) => {
      if (isMounted) setFavorites(cleanFavorites(updated));
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
      // The service already notified listeners with the new list; just make sure this card is gone.
      setFavorites((prev) => prev.filter((f) => f.id !== place.id && f.name !== place.name));
    } catch (e) {
      console.warn("Could not remove favorite:", e);
    }
  };

  const handlePlanTrip = (place) => {
    tapHaptic();
    const hasValidCoords =
      Number.isFinite(Number(place.lat)) &&
      Number.isFinite(Number(place.lon)) &&
      (Number(place.lat) !== 0 || Number(place.lon) !== 0);
    if (setTripData) {
      setTripData((prev) => ({
        ...prev,
        toLocation: {
          name: place.name || place.title,
          coordinates: hasValidCoords
            ? { lat: Number(place.lat), lng: Number(place.lon) }
            : null,
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
    return map[cleaned] || prettyLabel(cat);
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
            const rating = formatRating(place.rating);
            const imageUri = place.image;

            return (
              <FadeInView
                key={`${place.id || "fav"}_${idx}`}
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
                  <FavoriteImage uri={imageUri} label={title} />
                  <View style={styles.cardImageOverlay} />

                  <View style={styles.heroTopBadges}>
                    <View style={styles.categoryPill}>
                      <Ionicons name="location-outline" size={12} color={Palette.white} />
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
                      <Ionicons name="heart" size={20} color={Colors.DANGER || Palette.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.heroBottomRow}>
                    <Text style={styles.heroTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {title}
                    </Text>
                    {rating ? (
                      <View style={styles.ratingBadge} accessible accessibilityLabel={`Rating ${rating}`}>
                        <Ionicons name="star" size={13} color={Palette.warning} />
                        <Text style={styles.ratingText} maxFontSizeMultiplier={1.3}>{rating}</Text>
                      </View>
                    ) : null}
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
                    <Ionicons name="sparkles" size={15} color={Palette.white} style={styles.btnIcon} />
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
    height: 190, // fixed: on Android a percentage-sized image inside an auto-height box falls back to the photo's full size
    overflow: "hidden",
    backgroundColor: Palette.slate800, // dark base: white title text stays readable even if the photo cannot load
    position: "relative",
    justifyContent: "space-between",
    padding: 12,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
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
    color: Palette.white,
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
    color: Palette.white,
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
    color: Palette.white,
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
    color: Palette.white,
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
