import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useContext, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../Components/constants/constants";
import { getDestinationImage } from "../Components/constants/Destinations";
import { Radius, Spacing, Typography, useTheme } from "../Components/constants/theme";
import EmptyState from "../Components/ui/EmptyState";
import FadeInView from "../Components/ui/FadeInView";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { SkeletonCard } from "../Components/ui/Skeleton";
import { TouchableOpacity } from "../Components/ui/Touchable";
import { tapHaptic } from "../Components/utils/haptics";
import { deleteSavedTrip, getTripDestination, loadSavedTrips, toOpenableTrip } from "../Components/utils/SavedTrips";
import { CreateTripContext } from "../context/CreateTripContext";

/** Saved trips as their own page (opened from Profile), styled like My Bookings. */
export default function MyTripsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { setTripData } = useContext(CreateTripContext);
  const [trips, setTrips] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const accent = Colors.PRIMARY;

  const load = useCallback(async () => {
    try {
      setTrips(await loadSavedTrips());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  // Reload whenever the page comes into view (e.g. after saving or deleting elsewhere)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openTrip = async (trip) => {
    tapHaptic();
    const openable = toOpenableTrip(trip);
    try {
      await AsyncStorage.setItem("@goguide_cached_trip", JSON.stringify(openable));
    } catch {
      // cache is optional
    }
    setTripData?.(openable);
    router.push({ pathname: "/(tabs)/mytrip", params: { view: "plan" } });
  };

  const confirmDelete = (trip) => {
    const dest = getTripDestination(trip) || "this trip";
    Alert.alert("Delete trip", `Delete your trip to "${dest}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSavedTrip(trip);
          setTrips((prev) => prev.filter((t) => t !== trip));
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScreenHeader
        title="My Trips"
        subtitle="Your saved itineraries"
        badgeText={status === "ready" ? trips.length : undefined}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 84 }]} showsVerticalScrollIndicator={false}>
        {status === "loading" ? (
          <View style={{ gap: Spacing.md }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : status === "error" ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load your trips"
            text="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => {
              setStatus("loading");
              load();
            }}
          />
        ) : trips.length === 0 ? (
          <EmptyState
            icon="airplane-outline"
            title="No saved trips yet"
            text="Plan a trip and tap Save to Trips. It will appear here."
            actionLabel="Plan My Trip"
            onAction={() => router.push("/create-trip/search-place")}
          />
        ) : (
          trips.map((trip, idx) => {
            const dest = getTripDestination(trip) || "Trip";
            const plan = trip?.aiTripPlan || {};
            const days = plan?.itinerary?.length || trip?.totalNoOfDays;
            const duration = plan?.duration || (days ? `${days} Days` : null);
            const budget = String(plan?.budget || trip?.budget || "").replace(/^Custom:\s*/, "") || null;
            const created = trip?.createdAt ? new Date(trip.createdAt) : null;
            const photo = trip?.toLocationImage || trip?.locationInfo?.photoRef || getDestinationImage(dest);
            return (
              <FadeInView key={trip.id || idx} index={idx}>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.imageWrap}>
                    <Image source={{ uri: photo }} style={styles.image} accessibilityIgnoresInvertColors />
                    <LinearGradient colors={["transparent", "rgba(0,0,0,0.65)"]} style={styles.scrim} />
                    <Text style={styles.imageTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {dest.split(",")[0]}
                    </Text>
                    <TouchableOpacity
                      onPress={() => confirmDelete(trip)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete trip to ${dest}`}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.body}>
                    <Text style={[styles.dest, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {dest}
                    </Text>
                    <View style={styles.metaRow}>
                      {duration ? (
                        <View style={[styles.pill, { backgroundColor: theme.badgeBg }]}>
                          <Ionicons name="calendar-outline" size={13} color={theme.subtext} />
                          <Text style={[styles.pillText, { color: theme.subtext }]}>{duration}</Text>
                        </View>
                      ) : null}
                      {budget ? (
                        <View style={[styles.pill, { backgroundColor: theme.badgeBg }]}>
                          <Ionicons name="wallet-outline" size={13} color={theme.subtext} />
                          <Text style={[styles.pillText, { color: theme.subtext }]} numberOfLines={1}>{budget}</Text>
                        </View>
                      ) : null}
                    </View>
                    {created && !isNaN(created) ? (
                      <Text style={[styles.saved, { color: theme.subtext }]}>
                        Saved {created.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => openTrip(trip)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open itinerary for ${dest}`}
                      style={[styles.openBtn, { backgroundColor: accent }]}
                    >
                      <Text style={styles.openText}>Open Itinerary</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </FadeInView>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.gutter, gap: Spacing.md },
  card: { borderRadius: Radius.card, borderWidth: 1, overflow: "hidden" },
  imageWrap: { height: 140 },
  image: { width: "100%", height: "100%" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 80 },
  imageTitle: {
    position: "absolute",
    left: Spacing.md,
    right: 60,
    bottom: Spacing.sm,
    color: "#FFFFFF",
    fontSize: Typography.sizeXl,
    fontFamily: Typography.fontBold,
  },
  deleteBtn: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: Spacing.md, gap: 6 },
  dest: { fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, maxWidth: "100%" },
  pillText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },
  saved: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular },
  openBtn: {
    marginTop: Spacing.sm,
    minHeight: 46,
    borderRadius: Radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  openText: { color: "#FFFFFF", fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
});
