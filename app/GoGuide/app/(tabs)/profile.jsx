import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Image, Platform, ScrollView, StyleSheet, Switch, Text, View, Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Colors } from "../../Components/constants/constants";
import { useTheme, Palette } from "../../Components/constants/theme";
import PolicyModal from "../../Components/PolicyModal";
import { auth, db } from "../../Configs/FirebaseConfig";
import { CreateTripContext } from "../../context/CreateTripContext";
import { getDestinationImage } from "../../Components/constants/Destinations";
import { getFavoritePlaces, subscribeToFavorites, toggleFavoritePlace } from "../../Components/utils/FavoriteService";

import { TouchableOpacity } from "../../Components/ui/Touchable";
export default function Profile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setTripData, userData, setUserData, preferences, setPreferences, uid } = useContext(CreateTripContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({
    trips: 0,
    places: 0,
    bookings: 0,
  });

  const [savedTripsList, setSavedTripsList] = useState([]);
  const [favoritePlacesList, setFavoritePlacesList] = useState([]);
  const [showSavedTripsModal, setShowSavedTripsModal] = useState(false);
  const [policyModal, setPolicyModal] = useState({ visible: false, type: "terms" });

  // Track if user navigated to /trip or /explore from inside Saved Trips / Favorites modal
  const reopenSavedModalRef = useRef(false);
  const reopenFavoritesModalRef = useRef(false);

  // Fetch real user travel statistics
  const fetchStats = useCallback(async () => {
    let localTrips = [];
    try {
      const stored1 = await AsyncStorage.getItem("@goguide_user_trips");
      const stored2 = await AsyncStorage.getItem("@goguide_local_trips");
      const list1 = stored1 ? JSON.parse(stored1) : [];
      const list2 = stored2 ? JSON.parse(stored2) : [];
      if (Array.isArray(list1)) localTrips.push(...list1);
      if (Array.isArray(list2)) {
        list2.forEach((item) => {
          const normalized = {
            id: item.id,
            ...(item.tripData || {}),
            aiTripPlan: item.aiTripPlan || item.tripData?.aiTripPlan,
            createdAt: item.createdAt,
          };
          localTrips.push(normalized);
        });
      }
    } catch {}

    const user = auth.currentUser;
    const email = user?.email || userData?.email;

    let remoteTrips = [];
    let uniqueDestinations = new Set();

    if (email) {
      try {
        const tripsQuery = query(
          collection(db, "UserTrips"),
          where("userEmail", "==", email)
        );
        const tripsSnap = await getDocs(tripsQuery);
        tripsSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const normalized = {
            id: docSnap.id,
            ...(d?.tripData || {}),
            aiTripPlan: d?.aiTripPlan || d?.tripData?.aiTripPlan,
            createdAt: d?.createdAt,
            isFirestore: true,
          };
          remoteTrips.push(normalized);
        });
      } catch (err) {
        console.log("Stats fetch notice (offline/fallback):", err?.message);
      }
    }

    // Merge remote and local trips without duplicates (by ID and normalized destination)
    const seenIds = new Set();
    const seenDests = new Set();
    const mergedTrips = [];
    [...remoteTrips, ...localTrips].forEach((t) => {
      const destName =
        t?.aiTripPlan?.destination ||
        t?.toLocation?.name ||
        t?.destination ||
        t?.locationInfo?.name ||
        "";
      if (!destName) return;
      const destNorm = destName.toLowerCase().trim();
      const idKey = t.id ? String(t.id) : "";
      uniqueDestinations.add(destName.split(",")[0].trim());

      if ((idKey && seenIds.has(idKey)) || seenDests.has(destNorm)) {
        return;
      }
      if (idKey) seenIds.add(idKey);
      seenDests.add(destNorm);
      mergedTrips.push(t);
    });

    // Self-heal local storage if duplicates existed
    if (localTrips.length > mergedTrips.length) {
      AsyncStorage.setItem("@goguide_user_trips", JSON.stringify(mergedTrips)).catch(() => {});
    }

    // Query bookings count
    let bookingsCount = 0;
    try {
      const localBookingsRaw = await AsyncStorage.getItem("@goguide_user_bookings");
      const localBookings = localBookingsRaw ? JSON.parse(localBookingsRaw) : [];
      bookingsCount = Array.isArray(localBookings) ? localBookings.length : 0;
    } catch {}
    if (email) {
      try {
        const bookingsQuery = query(
          collection(db, "UserBookings"),
          where("userEmail", "==", email)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        bookingsCount = Math.max(bookingsCount, bookingsSnap.size);
      } catch {}
    }

    // Fetch favorites
    const favPlaces = await getFavoritePlaces();

    const totalTripsCount = mergedTrips.length;

    setSavedTripsList(mergedTrips);
    setFavoritePlacesList(favPlaces);
    setStats({
      trips: totalTripsCount,
      places: favPlaces.length > 0 ? favPlaces.length : (uniqueDestinations.size > 0 ? uniqueDestinations.size : (totalTripsCount > 0 ? totalTripsCount * 2 : 0)),
      bookings: bookingsCount,
    });
  }, [userData?.email]);

  // Refresh trips & stats and automatically re-open modal when returning via Back button
  useFocusEffect(
    useCallback(() => {
      fetchStats();
      if (reopenSavedModalRef.current || params?.openSaved === "true") {
        reopenSavedModalRef.current = false;
        setShowSavedTripsModal(true);
      }
      if (reopenFavoritesModalRef.current || params?.openFavorites === "true") {
        reopenFavoritesModalRef.current = false;
        router.push("/favourites");
      }
    }, [fetchStats, params?.openSaved, params?.openFavorites])
  );

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  // Pick profile photo from device gallery
  const pickProfilePhotoFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Permission to access device photo gallery is needed to set a custom profile photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        triggerHaptic();

        // Update local state and context
        if (setUserData) {
          setUserData((prev) => ({
            ...prev,
            avatar: pickedUri,
          }));
        }

        // Persist to Firestore if user is authenticated
        const currentUid = uid || auth.currentUser?.uid;
        if (currentUid) {
          try {
            const userRef = doc(db, "users", currentUid);
            await updateDoc(userRef, {
              avatar: pickedUri,
              updatedAt: new Date().toISOString(),
            });
          } catch (dbErr) {
            console.warn("Could not sync avatar to remote database:", dbErr);
          }
        }

        Alert.alert("Success", "Profile photo updated successfully!");
      }
    } catch (e) {
      console.error("Gallery picker error:", e);
      Alert.alert("Gallery Error", "Unable to open gallery. Please try again.");
    }
  };

  // Avatar Press Menu
  const handleAvatarAction = () => {
    triggerHaptic();
    if (Platform.OS === "web") {
      pickProfilePhotoFromGallery();
      return;
    }

    Alert.alert(
      "Profile Photo",
      "Upload a custom profile photo from your gallery or manage account settings:",
      [
        {
          text: "Choose from Gallery",
          onPress: pickProfilePhotoFromGallery,
        },
        {
          text: "Edit Account Info",
          onPress: () => handleNavigate("/edit-profile"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };


  // Subscribe to real-time changes in favorites
  useEffect(() => {
    const unsubscribe = subscribeToFavorites((favs) => {
      setFavoritePlacesList(favs);
      setStats((prev) => ({ ...prev, places: favs.length }));
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteSavedTrip = async (tripToDelete) => {
    triggerHaptic();
    if (!tripToDelete) return;
    const destTitle =
      tripToDelete?.aiTripPlan?.destination ||
      tripToDelete?.destination ||
      tripToDelete?.toLocation?.name ||
      tripToDelete?.locationInfo?.name ||
      "this trip";

    const proceedDelete = async () => {
      try {
        const targetDestNorm = String(destTitle || "").toLowerCase().trim();
        const getTripDestNorm = (t) =>
          String(
            t?.aiTripPlan?.destination ||
              t?.destination ||
              t?.toLocation?.name ||
              t?.locationInfo?.name ||
              ""
          )
            .toLowerCase()
            .trim();

        if (tripToDelete.id) {
          try {
            await deleteDoc(doc(db, "UserTrips", String(tripToDelete.id)));
          } catch {}
        }

        const stored1 = await AsyncStorage.getItem("@goguide_user_trips");
        if (stored1) {
          const list1 = JSON.parse(stored1);
          if (Array.isArray(list1)) {
            const filtered1 = list1.filter(
              (t) =>
                t.id !== tripToDelete.id &&
                t.createdAt !== tripToDelete.createdAt &&
                (!targetDestNorm || getTripDestNorm(t) !== targetDestNorm)
            );
            await AsyncStorage.setItem("@goguide_user_trips", JSON.stringify(filtered1));
          }
        }

        const stored2 = await AsyncStorage.getItem("@goguide_local_trips");
        if (stored2) {
          const list2 = JSON.parse(stored2);
          if (Array.isArray(list2)) {
            const filtered2 = list2.filter(
              (t) =>
                t.id !== tripToDelete.id &&
                t.createdAt !== tripToDelete.createdAt &&
                (!targetDestNorm || getTripDestNorm(t) !== targetDestNorm)
            );
            await AsyncStorage.setItem("@goguide_local_trips", JSON.stringify(filtered2));
          }
        }

        setSavedTripsList((prev) => {
          const next = prev.filter(
            (t) =>
              t.id !== tripToDelete.id &&
              t.createdAt !== tripToDelete.createdAt &&
              (!targetDestNorm || getTripDestNorm(t) !== targetDestNorm)
          );
          setStats((s) => ({ ...s, trips: next.length }));
          return next;
        });
      } catch (e) {
        console.error("Delete trip error:", e);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to delete your trip to "${destTitle}"?`)) {
        proceedDelete();
      }
    } else {
      Alert.alert(
        "Delete Trip",
        `Are you sure you want to delete your trip to "${destTitle}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: proceedDelete },
        ]
      );
    }
  };

  const handleRemoveFavorite = async (place) => {
    triggerHaptic();
    await toggleFavoritePlace(place);
    const updated = await getFavoritePlaces();
    setFavoritePlacesList(updated);
  };

  const toggleTheme = () => {
    triggerHaptic();
    setPreferences((prev) => ({
      ...prev,
      darkMode: !theme.isDark,
    }));
  };

  const toggleNotifications = () => {
    triggerHaptic();
    setPreferences((prev) => ({
      ...prev,
      notifications: !prev?.notifications,
    }));
  };

  const handleSignOut = () => {
    triggerHaptic();
    const executeSignOut = async () => {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Sign out local cleanup:", e);
      }
      router.replace("/auth/sign-in");
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out from GoGuide?")) {
        executeSignOut();
      }
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out from GoGuide?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: executeSignOut },
        ]
      );
    }
  };

  const handleNavigate = (target) => {
    triggerHaptic();
    if (typeof target === "object" && target?.onPress) {
      target.onPress();
    } else if (typeof target === "object" && target?.route) {
      router.push(target.route);
    } else if (typeof target === "string") {
      router.push(target);
    } else {
      Alert.alert("Coming Soon", "This feature is currently being curated.");
    }
  };

  // Determine explorer tier based on trip count
  const getExplorerTier = () => {
    if (stats.trips >= 5) {
      return { title: "Elite Globetrotter", level: "Tier 3", icon: "diamond-outline", color: Palette.purple };
    }
    if (stats.trips >= 1) {
      return { title: "Voyager Pro", level: "Tier 2", icon: "compass-outline", color: Palette.success };
    }
    return { title: "Novice Explorer", level: "Tier 1", icon: "sparkles-outline", color: Colors.PRIMARY };
  };

  const tier = getExplorerTier();

  // Unified Calm Luxury Brand Icon Styling (Theme-aware)
  const titleColor = theme.isDark ? theme.text : Colors.PRIMARY;
  const brandIconColor = theme.isDark ? Palette.skyLight : Colors.PRIMARY;
  const brandIconBg = theme.isDark ? "rgba(56, 189, 248, 0.12)" : "rgba(10, 126, 164, 0.08)";
  const brandBorderColor = theme.isDark ? "rgba(56, 189, 248, 0.22)" : "rgba(10, 126, 164, 0.14)";

  // Menu Groups
  const travelHubItems = [
    {
      id: "favorites",
      title: "Favourites",
      subtitle: "Liked attractions, beaches & spots",
      icon: "heart-outline",
      badge: favoritePlacesList.length > 0 ? `${favoritePlacesList.length}` : null,
      route: "/favourites",
    },
    {
      id: "bookings",
      title: "My Bookings",
      subtitle: "Digital passes, vouchers & QR codes",
      icon: "ticket-outline",
      route: "/my-bookings",
      badge: stats.bookings > 0 ? `${stats.bookings}` : null,
    },
    {
      id: "packing",
      title: "Smart Packing Checklist",
      subtitle: "AI generated luggage & gear list",
      icon: "bag-check-outline",
      route: "/packing-checklist",
    },
    {
      id: "explore",
      title: "Explore Destinations",
      subtitle: "Top rated beaches, mountains & cities",
      icon: "compass-outline",
      route: "/explore",
    },
  ];

  const securityItems = [
    {
      id: "account",
      title: "Account & Security",
      subtitle: "Personal profile, password & GDPR export",
      icon: "shield-checkmark-outline",
      route: "/edit-profile",
    },
    {
      id: "safety",
      title: "Safety Alerts & Advisories",
      subtitle: "Emergency contacts & travel safety info",
      icon: "warning-outline",
      route: "/safety-alerts",
    },
    {
      id: "location",
      title: "Saved Location",
      subtitle: "Home base & GPS coordinate setup",
      icon: "location-outline",
      route: "/location",
    },
  ];

  const settingsItems = [
    {
      id: "preferences",
      title: "Preferences",
      subtitle: "Theme, currency, units & AI personality",
      icon: "options-outline",
      route: "/preferences",
    },
    {
      id: "help",
      title: "Help Center & Support",
      subtitle: "Instant AI assistant & support tickets",
      icon: "help-circle-outline",
      route: "/help-center",
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      subtitle: "Data protection, GDPR & traveler rights",
      icon: "shield-checkmark-outline",
      onPress: () => router.push("/privacy-policy"),
    },
    {
      id: "terms",
      title: "Terms of Service",
      subtitle: "AI disclaimer, bookings & terms of use",
      icon: "document-text-outline",
      onPress: () => router.push("/terms-of-service"),
    },
  ];

  const renderMenuItem = (item, isLast) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.badge ? `${item.title}, ${item.badge}` : item.title}
      accessibilityHint={item.subtitle}
      onPress={() => {
        triggerHaptic();
        if (typeof item.onPress === 'function') {
          item.onPress();
        } else if (item.route) {
          router.push(item.route);
        } else {
          handleNavigate(item);
        }
      }}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuIconContainer,
          {
            backgroundColor: brandIconBg,
            borderColor: brandBorderColor,
          },
        ]}
      >
        <Ionicons name={item.icon} size={20} color={brandIconColor} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>{item.title}</Text>
        <Text style={[styles.menuSubtitle, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>{item.subtitle}</Text>
      </View>
      {item.badge && (
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.subtext}
        style={{ marginLeft: 6 }}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.headerBorder }]}>
        <Text style={[styles.headerTitle, { color: theme.isDark ? theme.text : Colors.PRIMARY }]}>
          Profile
        </Text>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeToggleBtn, { backgroundColor: theme.badgeBg, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={theme.isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Ionicons
            name={theme.isDark ? "sunny" : "moon"}
            size={20}
            color={theme.isDark ? Palette.warningLight : theme.subtext}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 84 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Identity Card */}
        <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatarAction}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Change Profile Photo"
          >
            <Image
              source={{
                uri: userData?.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
              }}
              style={styles.avatar}
            />
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={14} color={Palette.white} />
            </View>
          </TouchableOpacity>

          <Text style={[styles.userName, { color: theme.text }]}>
            {userData?.name || "Guest"}
          </Text>
          <Text style={[styles.userEmail, { color: theme.subtext }]}>
            {userData?.email || "Guest account"}
          </Text>

          {/* Explorer Tier Pill */}
          <View style={[styles.tierPill, { backgroundColor: `${tier.color}15`, borderColor: `${tier.color}40` }]}>
            <Ionicons name={tier.icon} size={14} color={tier.color} />
            <Text style={[styles.tierText, { color: tier.color }]}>
              {tier.title} • {tier.level}
            </Text>
          </View>
        </View>

        {/* Travel Quick Action Bar: Trips, Favourites, Bookings (Icon Symbols + Name Only, No Numbers) */}
        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.statCol}
            onPress={() => {
              triggerHaptic();
              router.push("/my-trips");
            }}
            accessibilityRole="button"
            accessibilityLabel="My Trips"
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
              <Ionicons name="airplane" size={22} color={Colors.PRIMARY} />
            </View>
            <Text style={[styles.statLabel, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Trips</Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.statCol}
            onPress={() => {
              triggerHaptic();
              router.push("/favourites");
            }}
            accessibilityRole="button"
            accessibilityLabel="Favourites"
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
              <Ionicons name="heart" size={22} color={Colors.PRIMARY} />
            </View>
            <Text style={[styles.statLabel, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Favourites</Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.statCol}
            onPress={() => handleNavigate("/my-bookings")}
            accessibilityRole="button"
            accessibilityLabel="Bookings"
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(2, 132, 199, 0.12)" }]}>
              <Ionicons name="ticket" size={22} color={Palette.skyDark} />
            </View>
            <Text style={[styles.statLabel, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Bookings</Text>
          </TouchableOpacity>
        </View>

        {/* Section 1: Travel Hub */}
        <Text style={[styles.sectionHeading, { color: theme.subtext }]}>TRAVEL HUB</Text>
        <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {travelHubItems.map((item, idx) => renderMenuItem(item, idx === travelHubItems.length - 1))}
        </View>

        {/* Section 2: Personal & Safety */}
        <Text style={[styles.sectionHeading, { color: theme.subtext }]}>PERSONAL & SAFETY</Text>
        <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {securityItems.map((item, idx) => renderMenuItem(item, idx === securityItems.length - 1))}
        </View>

        {/* Section 3: Preferences & Support */}
        <Text style={[styles.sectionHeading, { color: theme.subtext }]}>APP & NOTIFICATIONS</Text>
        <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Direct Smart Alerts Switch */}
          <View
            style={[
              styles.menuRow,
              { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: brandIconBg, borderColor: brandBorderColor }]}>
              <Ionicons
                name={preferences?.notifications ? "notifications" : "notifications-off-outline"}
                size={20}
                color={preferences?.notifications ? brandIconColor : theme.subtext}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Smart Travel Alerts</Text>
              <Text style={[styles.menuSubtitle, { color: theme.subtext }]}>
                {preferences?.notifications ? "Active: Weather, departures & packing" : "Notifications Muted"}
              </Text>
            </View>
            <Switch
              value={!!preferences?.notifications}
              onValueChange={toggleNotifications}
              accessibilityLabel="Smart Travel Alerts"
              accessibilityState={{ checked: !!preferences?.notifications }}
              trackColor={{ false: theme.isDark ? "#333" : "#D1D5DB", true: Colors.PRIMARY }}
              thumbColor={Palette.white}
            />
          </View>
          {settingsItems.map((item, idx) => renderMenuItem(item, idx === settingsItems.length - 1))}
        </View>

        {/* Section 4: Sign Out */}
        <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
          <TouchableOpacity
            style={styles.signOutRow}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign Out"
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconContainer,
                {
                  backgroundColor: theme.isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
                  borderColor: theme.isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA",
                },
              ]}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.isDark ? Palette.dangerLight : Palette.dangerDark} />
            </View>
            <Text style={[styles.signOutText, { color: theme.isDark ? Palette.dangerLight : Palette.dangerDark }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footerWrap}>
          <Text style={[styles.footerText, { color: theme.subtext }]}>GoGuide AI Agent • Version 1.0.0</Text>
          <Text style={[styles.footerSubtext, { color: theme.subtext }]}>
            Cloud Synced • Offline Capable • Built for Travelers
          </Text>
        </View>
      </ScrollView>

      {/* 1. MY TRIPS & HISTORY MODAL */}
      <Modal statusBarTranslucent
        visible={showSavedTripsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSavedTripsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Modal Header: Clean, Responsive with Back Button */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
                onPress={() => setShowSavedTripsModal(false)}
                style={styles.modalBackBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={22} color={titleColor} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: titleColor, fontSize: 19, marginLeft: 8 }]} numberOfLines={1}>
                My Trips
              </Text>
              <View style={[styles.modalBadge, { backgroundColor: brandIconBg, marginLeft: 8 }]}>
                <Text style={[styles.modalBadgeText, { color: brandIconColor }]}>
                  {savedTripsList.length}
                </Text>
              </View>
            </View>

            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close"
              style={[styles.modalCloseBtn, { backgroundColor: theme.isDark ? "#282828" : "#E5E7EB" }]}
              onPress={() => setShowSavedTripsModal(false)}
            >
              <Ionicons name="close" size={20} color={titleColor} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Quick Action Buttons Row (Side-by-side, fits 100% of screen without cutoff) */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(10, 126, 164, 0.12)",
                  borderWidth: 1,
                  borderColor: Colors.PRIMARY,
                  paddingVertical: 11,
                  borderRadius: 14,
                }}
                onPress={() => {
                  triggerHaptic();
                  setShowSavedTripsModal(false);
                  router.push("/(tabs)/mytrip");
                }}
              >
                <Ionicons name="compass-outline" size={16} color={Colors.PRIMARY} style={{ marginRight: 6 }} />
                <Text style={{ color: Colors.PRIMARY, fontSize: 13, fontFamily: "Outfit-Bold" }}>
                  My Trips Hub ✈️
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: Colors.PRIMARY,
                  paddingVertical: 11,
                  borderRadius: 14,
                }}
                onPress={() => {
                  triggerHaptic();
                  setShowSavedTripsModal(false);
                  router.push("/create-trip/search-place");
                }}
              >
                <Ionicons name="add-circle-outline" size={17} color={Palette.white} style={{ marginRight: 5 }} />
                <Text style={{ color: Palette.white, fontSize: 13, fontFamily: "Outfit-Bold" }}>
                  Plan New Trip
                </Text>
              </TouchableOpacity>
            </View>
            {/* Explorer Tier Progress Card inside Trips Modal */}
            <View
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: `${tier.color}18`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Ionicons name={tier.icon} size={20} color={tier.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: titleColor }}>
                    {tier.title} ({tier.level})
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: theme.subtext, marginTop: 2 }}>
                    {stats.trips >= 5
                      ? "Top Explorer Rank Unlocked! 🌍"
                      : `${Math.max(0, 5 - stats.trips)} more trip${5 - stats.trips === 1 ? "" : "s"} to unlock Elite Globetrotter`}
                  </Text>
                </View>
              </View>
            </View>

            {savedTripsList.length === 0 ? (
              <View style={styles.modalEmptyWrap}>
                <Ionicons name="airplane-outline" size={54} color={theme.subtext} />
                <Text style={[styles.modalEmptyTitle, { color: titleColor }]}>No Saved Trips Yet</Text>
                <Text style={[styles.modalEmptySub, { color: theme.subtext }]}>
                  Your generated itineraries will appear here with full offline access.
                </Text>
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: Colors.PRIMARY }]}
                  onPress={() => {
                    setShowSavedTripsModal(false);
                    router.push("/create-trip/search-place");
                  }}
                >
                  <Ionicons name="sparkles" size={16} color={Palette.white} style={{ marginRight: 6 }} />
                  <Text style={styles.modalPrimaryBtnText}>Plan a New Trip</Text>
                </TouchableOpacity>
              </View>
            ) : (
              savedTripsList.map((trip, idx) => {
                const dest =
                  trip?.aiTripPlan?.destination ||
                  trip?.destination ||
                  trip?.toLocation?.name ||
                  trip?.locationInfo?.name ||
                  "Trip Adventure";
                const duration = trip?.aiTripPlan?.duration || trip?.totalNoOfDays || "3 Days";
                const budget = trip?.aiTripPlan?.budget || trip?.budget || "Moderate";
                const photo =
                  trip?.toLocationImage ||
                  trip?.locationInfo?.photoRef ||
                  getDestinationImage(dest);

                return (
                  <View
                    key={trip.id || idx}
                    style={[styles.tripItemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Image source={{ uri: photo }} style={styles.tripItemImg} />
                    <View style={styles.tripItemBody}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Text style={[styles.tripItemTitle, { color: titleColor }]} numberOfLines={1}>
                          {dest}
                        </Text>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete"
                          onPress={() => handleDeleteSavedTrip(trip)}
                          style={styles.tripItemDelete}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={Palette.danger} />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.tripItemMeta, { color: theme.subtext }]}>
                        {duration} • {budget}
                      </Text>

                      <TouchableOpacity
                        style={[styles.openTripBtn, { backgroundColor: Colors.PRIMARY }]}
                        onPress={async () => {
                          triggerHaptic();
                          try {
                            await AsyncStorage.setItem(
                              "@goguide_cached_trip",
                              JSON.stringify(trip.aiTripPlan ? trip : { ...trip, aiTripPlan: trip.aiTripPlan || trip })
                            );
                          } catch {}
                          if (setTripData) {
                            setTripData(trip.aiTripPlan ? trip : { ...trip, aiTripPlan: trip.aiTripPlan || trip });
                          }
                          setShowSavedTripsModal(false);
                          router.push({ pathname: "/(tabs)/mytrip", params: { view: "plan" } });
                        }}
                      >
                        <Text style={styles.openTripBtnText}>Open Itinerary</Text>
                        <Ionicons name="arrow-forward" size={13} color={Palette.white} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Same-page Policy / Terms Modal */}
      <PolicyModal
        visible={policyModal.visible}
        type={policyModal.type}
        onClose={() => setPolicyModal({ visible: false, type: "terms" })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
  },
  themeToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },
  userCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.PRIMARY,
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.PRIMARY,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Palette.white,
  },
  userName: {
    fontSize: 22,
    fontFamily: "Outfit-Bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    marginBottom: 10,
  },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  tierText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    marginLeft: 6,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    marginTop: 6,
  },
  statDivider: {
    width: 1,
    height: 26,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 6,
  },
  groupCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Medium",
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: Palette.white,
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Outfit-Medium",
    color: Palette.dangerDark,
  },
  footerWrap: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 3,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
  },
  modalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalBadgeText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  modalBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  modalEmptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 16,
  },
  modalEmptyTitle: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
    marginTop: 16,
    marginBottom: 6,
  },
  modalEmptySub: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  modalPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalPrimaryBtnText: {
    color: Palette.white,
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  tripItemCard: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: Palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tripItemImg: {
    width: 105,
    height: "100%",
    minHeight: 110,
    resizeMode: "cover",
  },
  tripItemBody: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  tripItemTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    flex: 1,
    marginRight: 6,
  },
  tripItemDelete: {
    padding: 2,
  },
  tripItemMeta: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginVertical: 4,
  },
  openTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  openTripBtnText: {
    color: Palette.white,
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
});
