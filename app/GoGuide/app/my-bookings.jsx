import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { directionsUrl } from "../Components/utils/mapsLinks";
import { openExternalUrl } from "../Components/utils/openExternalUrl";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors } from "../Components/constants/constants";
import { Typography, useTheme, Palette } from "../Components/constants/theme";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { SkeletonCard } from "../Components/ui/Skeleton";
import { auth, db } from "../Configs/FirebaseConfig";
import { CreateTripContext } from "../context/CreateTripContext";
import FavoriteHeartButton from "../Components/FavoriteHeartButton";

import { TouchableOpacity } from "../Components/ui/Touchable";
import { goBack } from "../Components/utils/navigation";
const STATUS_TABS = ["Upcoming", "Completed", "Cancelled"];
const CATEGORY_FILTERS = ["All", "Hotels", "Flights", "Activities"];

export default function MyBookings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { userData } = useContext(CreateTripContext);

  const [activeTab, setActiveTab] = useState("Upcoming");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Digital Pass Modal State
  const [selectedPass, setSelectedPass] = useState(null);
  const [isPassModalVisible, setIsPassModalVisible] = useState(false);

  const activeAccent = Colors.PRIMARY || Palette.slate900;
  const badgeBg = theme.isDark ? "#222232" : Palette.slate100;
  const iconColor = theme.isDark ? Palette.slate300 : Palette.slate600;

  // Load custom bookings from Local Storage (@goguide_user_bookings) & Firestore
  useEffect(() => {
    (async () => {
      let localBookings = [];
      try {
        const stored = await AsyncStorage.getItem("@goguide_user_bookings");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) localBookings = parsed;
        }
      } catch (e) {
        console.log("Error reading local bookings:", e);
      }

      let remoteBookings = [];
      if (auth.currentUser?.email) {
        try {
          const q = query(
            collection(db, "UserBookings"),
            where("userEmail", "==", auth.currentUser.email)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            remoteBookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          }
        } catch {
          // Firestore offline fallback
        }
      }

      // Merge remote and local bookings avoiding duplicate IDs or bookingRefs
      const combined = [...remoteBookings];
      localBookings.forEach((lb) => {
        const isDuplicate = combined.some(
          (b) => b.id === lb.id || (b.bookingRef && lb.bookingRef && b.bookingRef === lb.bookingRef)
        );
        if (!isDuplicate) {
          combined.push(lb);
        }
      });

      setBookings(combined);
      setLoading(false);
    })();
  }, []);

  const filteredBookings = bookings.filter((item) => {
    const matchesTab = item.status === activeTab;
    const matchesCategory =
      selectedCategory === "All" || item.type === selectedCategory;
    return matchesTab && matchesCategory;
  });

  const handleOpenMap = (booking) => {
    // Exact coordinates when the booking has them (hotels); text query otherwise.
    const url = directionsUrl(
      { coordinates: booking.coordinates, name: booking.subtitle || booking.title },
      ""
    );
    openExternalUrl(url);
  };

  const handleOpenDigitalPass = (booking) => {
    setSelectedPass(booking);
    setIsPassModalVisible(true);
  };

  const handleCopyRef = (ref) => {
    Alert.alert("Booking Code", `Copied reference: #${ref}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header matching golden reference */}
      <ScreenHeader
        title="My Bookings"
        subtitle="Your planned flights, stays & activities"
        onBack={() => goBack(router)}
      />

      <Text
        style={{ color: theme.subtext, fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, paddingHorizontal: 16, paddingTop: 8 }}
        maxFontSizeMultiplier={1.3}
      >
        These are your trip plans, not confirmed bookings. Prices and times are estimates, so check availability with each provider.
      </Text>

      {/* Status Segmented Tabs */}
      <View style={[styles.tabBarWrap, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab;
          const count = bookings.filter((b) => b.status === tab).length;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabItem,
                isActive && { borderBottomColor: activeAccent, borderBottomWidth: 2 },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab}, ${count} bookings`}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? activeAccent : theme.subtext,
                    fontFamily: isActive ? "Outfit-Bold" : "Outfit-Medium",
                  },
                ]}
              >
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 84 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected
                    ? { backgroundColor: activeAccent, borderColor: activeAccent }
                    : {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected
                        ? Palette.white
                        : theme.isDark
                        ? Palette.slate300
                        : Palette.slate600,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Bookings List */}
        {loading ? (
          <View style={{ gap: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: badgeBg }]}>
              <Ionicons name="briefcase-outline" size={38} color={theme.subtext} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No {activeTab.toLowerCase()} bookings found
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.subtext }]}>
              When you confirm stays, flights or tours through GoGuide AI, your digital passes will appear here.
            </Text>
            <TouchableOpacity
              style={[styles.exploreBtn, { backgroundColor: activeAccent }]}
              accessibilityRole="button"
              accessibilityLabel="Discover Destinations"
              onPress={() => router.push("/(tabs)/discover")}
            >
              <Text style={styles.exploreBtnText}>Discover Destinations ✨</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredBookings.map((item) => {
            const isUpcoming = item.status === "Upcoming";
            return (
              <View
                key={item.id}
                style={[
                  styles.bookingCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Card Top Banner with Image */}
                <View style={styles.cardHero}>
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <View style={styles.cardImageOverlay} />

                  <View style={styles.heroTopBadges}>
                    <View style={styles.typeBadge}>
                      <Ionicons
                        name={
                          item.type === "Hotels"
                            ? "bed"
                            : item.type === "Flights"
                            ? "airplane"
                            : "ticket"
                        }
                        size={12}
                        color={Palette.white}
                      />
                      <Text style={styles.typeBadgeText}>{item.type}</Text>
                    </View>

                    <View style={styles.topRightActions}>
                      <View
                        style={[
                          styles.statusPill,
                          isUpcoming
                            ? { backgroundColor: "rgba(16, 185, 129, 0.9)" }
                            : { backgroundColor: "rgba(100, 116, 139, 0.9)" },
                        ]}
                      >
                        <Text style={styles.statusPillText}>● {item.status}</Text>
                      </View>
                      <FavoriteHeartButton
                        place={{
                          name: item.title,
                          tag: item.type || "Booking",
                          img: item.image,
                          desc: item.subtitle || item.details || "Saved from My Bookings",
                        }}
                        size={14}
                        style={{
                          position: "relative",
                          top: 0,
                          right: 0,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.heroBottomTitle}>
                    <Text style={styles.heroTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.heroSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>

                {/* Card Body Information */}
                <View style={styles.cardBody}>
                  {/* Reference & Price Row */}
                  <View style={styles.infoMetaRow}>
                    <TouchableOpacity
                      style={styles.refCodeBox}
                      accessibilityRole="button"
                      accessibilityLabel={`Copy booking reference ${item.bookingRef}`}
                      onPress={() => handleCopyRef(item.bookingRef)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.refLabel, { color: theme.subtext }]}>REF:</Text>
                      <Text style={[styles.refCode, { color: activeAccent }]} numberOfLines={1}>
                        #{item.bookingRef}
                      </Text>
                      <Ionicons name="copy-outline" size={13} color={activeAccent} />
                    </TouchableOpacity>

                    <Text style={[styles.priceTag, { color: theme.text }]} numberOfLines={1}>
                      {item.price}
                    </Text>
                  </View>

                  {/* Dates Row */}
                  <View style={styles.scheduleRow}>
                    <View style={[styles.scheduleCol, { alignItems: "flex-start" }]}>
                      <Text style={[styles.scheduleLabel, { color: theme.subtext }]}>
                        {item.type === "Flights" ? "DEPARTURE" : "CHECK-IN"}
                      </Text>
                      <Text style={[styles.scheduleValue, { color: theme.text }]} numberOfLines={1}>
                        {item.checkIn}
                      </Text>
                    </View>

                    <View style={styles.scheduleArrowWrap}>
                      <Ionicons
                        name="arrow-forward"
                        size={15}
                        color={theme.subtext}
                      />
                    </View>

                    <View style={[styles.scheduleCol, { alignItems: "flex-end" }]}>
                      <Text style={[styles.scheduleLabel, { color: theme.subtext }]}>
                        {item.type === "Flights" ? "ARRIVAL" : "CHECK-OUT"}
                      </Text>
                      <Text style={[styles.scheduleValue, { color: theme.text }]} numberOfLines={1}>
                        {item.checkOut}
                      </Text>
                    </View>
                  </View>

                  {/* Details text */}
                  <View style={[styles.roomDetailWrap, { backgroundColor: badgeBg }]}>
                    <Ionicons name="information-circle-outline" size={14} color={iconColor} />
                    <Text style={[styles.roomDetailText, { color: theme.isDark ? Palette.slate300 : Palette.slate600 }]}>
                      {item.details}
                    </Text>
                  </View>

                  {/* Action Buttons Row */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.mapBtn, { borderColor: theme.border }]}
                      accessibilityRole="button"
                      accessibilityLabel="Open location in maps"
                      onPress={() => handleOpenMap(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-outline" size={16} color={activeAccent} />
                      <Text style={[styles.mapBtnText, { color: activeAccent }]}>Location</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.passBtn, { backgroundColor: activeAccent }]}
                      accessibilityRole="button"
                      accessibilityLabel="Open digital pass"
                      onPress={() => handleOpenDigitalPass(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="qr-code-outline" size={16} color={Palette.white} />
                      <Text style={styles.passBtnText}>Digital Pass</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Digital Pass / QR Voucher Modal */}
      <Modal statusBarTranslucent
        visible={isPassModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPassModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.passModalBox, { backgroundColor: theme.card }]}>
            {/* Modal Header */}
            <View style={styles.passModalHeader}>
              <View>
                <Text style={[styles.passModalTitle, { color: theme.text }]}>
                  {selectedPass?.type === "Flights" ? "Flight Plan Summary" : "Plan Summary"}
                </Text>
                <Text style={[styles.passModalSub, { color: theme.subtext }]}>
                  Planning reference only. This is not an official ticket or voucher.
                </Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close"
                onPress={() => setIsPassModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Pass Card */}
            <View style={[styles.passBodyCard, { backgroundColor: badgeBg }]}>
              <Text style={[styles.passPlaceName, { color: theme.text }]}>
                {selectedPass?.title}
              </Text>
              <Text style={[styles.passGuestName, { color: theme.subtext }]}>
                Traveler: {userData?.name || "GoGuide Traveler"}
              </Text>

              {/* QR Code */}
              <View style={styles.qrContainer}>
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GOGUIDE_${selectedPass?.bookingRef || "PASS"}`,
                  }}
                  style={styles.qrImage}
                />
              </View>

              <Text style={[styles.passRefText, { color: activeAccent }]}>
                PLAN REF #{selectedPass?.bookingRef}
              </Text>
              <Text style={[styles.passDatesText, { color: theme.subtext }]}>
                Valid: {selectedPass?.checkIn}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: activeAccent }]}
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={() => setIsPassModalVisible(false)}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
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
  tabBarWrap: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  bookingCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardHero: {
    height: 140,
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
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  heroTopBadges: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    color: Palette.white,
    fontFamily: "Outfit-Medium",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 12,
    color: Palette.white,
    fontFamily: "Outfit-Bold",
  },
  heroBottomTitle: {
    gap: 2,
    paddingRight: 8,
  },
  heroTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    color: Palette.white,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    color: "rgba(255,255,255,0.85)",
  },
  cardBody: {
    padding: 14,
    gap: 12,
  },
  infoMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  refCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    marginRight: 8,
  },
  refLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
  refCode: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  priceTag: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scheduleCol: {
    flex: 1,
    minWidth: 0,
  },
  scheduleArrowWrap: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  scheduleLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scheduleValue: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  roomDetailWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roomDetailText: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  mapBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  mapBtnText: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  passBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  passBtnText: {
    color: Palette.white,
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  exploreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  exploreBtnText: {
    color: Palette.white,
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  passModalBox: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
  },
  passModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  passModalTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
  },
  passModalSub: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  passBodyCard: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 6,
  },
  passPlaceName: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
  },
  passGuestName: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginBottom: 10,
  },
  qrContainer: {
    backgroundColor: Palette.white,
    padding: 12,
    borderRadius: 12,
    shadowColor: Palette.black,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  qrImage: {
    width: 160,
    height: 160,
  },
  passRefText: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  passDatesText: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
  doneBtn: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
  },
  doneBtnText: {
    color: Palette.white,
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
});
