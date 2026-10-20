import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../Components/constants/constants";
import { useTheme } from "../Components/constants/theme";
import { auth, db } from "../Configs/FirebaseConfig";
import { CreateTripContext } from "../context/CreateTripContext";

const STATUS_TABS = ["Upcoming", "Completed", "Cancelled"];
const CATEGORY_FILTERS = ["All", "Hotels", "Flights", "Activities"];

const SAMPLE_BOOKINGS = [
  {
    id: "bk_1",
    type: "Hotels",
    status: "Upcoming",
    bookingRef: "GG-84921",
    title: "Grand Hyatt Tokyo",
    subtitle: "Roppongi Hills, Minato City, Tokyo, Japan",
    checkIn: "Nov 14, 2026 • 3:00 PM",
    checkOut: "Nov 19, 2026 • 11:00 AM",
    details: "Deluxe King Room • 1 Room, 2 Guests",
    price: "$640.00",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop",
    coordinates: { lat: 35.6599, lng: 139.729 },
  },
  {
    id: "bk_2",
    type: "Flights",
    status: "Upcoming",
    bookingRef: "GG-51892",
    title: "Emirates Flight EK-601",
    subtitle: "DXB (Dubai) ✈️ HND (Tokyo Haneda)",
    checkIn: "Nov 14, 2026 • 08:30 AM",
    checkOut: "Nov 14, 2026 • 10:45 PM",
    details: "Seat 14A, 14B • Terminal 3 • Economy Premium",
    price: "$820.00",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=800&auto=format&fit=crop",
    coordinates: { lat: 25.2532, lng: 55.3657 },
  },
  {
    id: "bk_3",
    type: "Activities",
    status: "Completed",
    bookingRef: "GG-20391",
    title: "Mount Fuji & Hakone Day Tour",
    subtitle: "Shinjuku Center Building, Tokyo",
    checkIn: "Oct 10, 2026 • 08:00 AM",
    checkOut: "Oct 10, 2026 • 06:30 PM",
    details: "Guided Express Coach & Lake Ashi Cruise",
    price: "$145.00",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop",
    coordinates: { lat: 35.3606, lng: 138.7274 },
  },
];

export default function MyBookings() {
  const router = useRouter();
  const theme = useTheme();
  const { userData, preferences } = useContext(CreateTripContext);

  const [activeTab, setActiveTab] = useState("Upcoming");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [bookings, setBookings] = useState(SAMPLE_BOOKINGS);
  const [loading, setLoading] = useState(false);

  // Digital Pass Modal State
  const [selectedPass, setSelectedPass] = useState(null);
  const [isPassModalVisible, setIsPassModalVisible] = useState(false);

  const activeAccent = Colors.PRIMARY || "#0F172A";
  const badgeBg = theme.isDark ? "#222232" : "#F1F5F9";
  const iconColor = theme.isDark ? "#CBD5E1" : "#475569";

  // Load custom bookings from Firestore if present
  useEffect(() => {
    (async () => {
      if (!auth.currentUser?.email) return;
      try {
        const q = query(
          collection(db, "UserBookings"),
          where("userEmail", "==", auth.currentUser.email)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userBookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setBookings([...userBookings, ...SAMPLE_BOOKINGS]);
        }
      } catch (e) {
        // Sample bookings remain as fallback
      }
    })();
  }, []);

  const filteredBookings = bookings.filter((item) => {
    const matchesTab = item.status === activeTab;
    const matchesCategory =
      selectedCategory === "All" || item.type === selectedCategory;
    return matchesTab && matchesCategory;
  });

  const handleOpenMap = (booking) => {
    const query = booking.subtitle || booking.title;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(query)}`,
      android: `geo:0,0?q=${encodeURIComponent(query)}`,
      web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
    });
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
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.header,
            borderBottomColor: theme.isDark ? "#20202F" : "#E2E8F0",
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.isDark ? theme.text : activeAccent}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.isDark ? theme.text : activeAccent },
            ]}
          >
            My Bookings
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.isDark ? "#94A3B8" : "#64748B" },
            ]}
          >
            Digital boarding passes, hotel vouchers & tickets
          </Text>
        </View>
      </View>

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
        contentContainerStyle={styles.scrollContent}
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
                        ? "#FFFFFF"
                        : theme.isDark
                        ? "#CBD5E1"
                        : "#475569",
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
        {filteredBookings.length === 0 ? (
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
                        color="#FFFFFF"
                      />
                      <Text style={styles.typeBadgeText}>{item.type}</Text>
                    </View>

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
                      onPress={() => handleCopyRef(item.bookingRef)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.refLabel, { color: theme.subtext }]}>REF:</Text>
                      <Text style={[styles.refCode, { color: activeAccent }]}>
                        #{item.bookingRef}
                      </Text>
                      <Ionicons name="copy-outline" size={13} color={activeAccent} />
                    </TouchableOpacity>

                    <Text style={[styles.priceTag, { color: theme.text }]}>
                      {item.price}
                    </Text>
                  </View>

                  {/* Dates Row */}
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleCol}>
                      <Text style={[styles.scheduleLabel, { color: theme.subtext }]}>
                        {item.type === "Flights" ? "DEPARTURE" : "CHECK-IN"}
                      </Text>
                      <Text style={[styles.scheduleValue, { color: theme.text }]}>
                        {item.checkIn}
                      </Text>
                    </View>

                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={theme.subtext}
                      style={{ marginTop: 12 }}
                    />

                    <View style={styles.scheduleCol}>
                      <Text style={[styles.scheduleLabel, { color: theme.subtext }]}>
                        {item.type === "Flights" ? "ARRIVAL" : "CHECK-OUT"}
                      </Text>
                      <Text style={[styles.scheduleValue, { color: theme.text }]}>
                        {item.checkOut}
                      </Text>
                    </View>
                  </View>

                  {/* Details text */}
                  <View style={[styles.roomDetailWrap, { backgroundColor: badgeBg }]}>
                    <Ionicons name="information-circle-outline" size={14} color={iconColor} />
                    <Text style={[styles.roomDetailText, { color: theme.isDark ? "#CBD5E1" : "#475569" }]}>
                      {item.details}
                    </Text>
                  </View>

                  {/* Action Buttons Row */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.mapBtn, { borderColor: theme.border }]}
                      onPress={() => handleOpenMap(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-outline" size={16} color={activeAccent} />
                      <Text style={[styles.mapBtnText, { color: activeAccent }]}>Location</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.passBtn, { backgroundColor: activeAccent }]}
                      onPress={() => handleOpenDigitalPass(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
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
      <Modal
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
                  {selectedPass?.type === "Flights" ? "Digital Boarding Pass" : "Check-in Voucher"}
                </Text>
                <Text style={[styles.passModalSub, { color: theme.subtext }]}>
                  Present this QR code at reception or terminal
                </Text>
              </View>
              <TouchableOpacity
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
                Guest: {userData?.name || "Confirmed Traveler"}
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
                CONFIRMATION #{selectedPass?.bookingRef}
              </Text>
              <Text style={[styles.passDatesText, { color: theme.subtext }]}>
                Valid: {selectedPass?.checkIn}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: activeAccent }]}
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
    paddingTop: Platform.OS === "ios" ? 54 : 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
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
    fontSize: 11,
    color: "#FFFFFF",
    fontFamily: "Outfit-Medium",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontFamily: "Outfit-Bold",
  },
  heroBottomTitle: {
    gap: 2,
  },
  heroTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    color: "#FFFFFF",
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
  },
  refLabel: {
    fontSize: 11,
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
    alignItems: "flex-start",
  },
  scheduleCol: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 10,
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
    color: "#FFFFFF",
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
    color: "#FFFFFF",
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
    fontSize: 11,
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
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
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
    fontSize: 11,
    fontFamily: "Outfit-Regular",
  },
  doneBtn: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
});
