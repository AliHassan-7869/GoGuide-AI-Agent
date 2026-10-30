import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import { auth, db } from "../../Configs/FirebaseConfig";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function Profile() {
  const router = useRouter();
  const { userData, setUserData, preferences, setPreferences, uid } = useContext(CreateTripContext);
  const theme = useTheme();

  const [stats, setStats] = useState({
    trips: 0,
    places: 0,
    bookings: 0,
  });

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
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

  // Fetch real user travel statistics
  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      let localTrips = [];
      try {
        const stored = await AsyncStorage.getItem("@goguide_user_trips");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) localTrips = parsed;
        }
      } catch (e) {}

      const user = auth.currentUser;
      const email = user?.email || userData?.email;

      let remoteCount = 0;
      let uniqueDestinations = new Set();

      localTrips.forEach((t) => {
        const destName = t?.toLocation?.name || t?.destination || t?.aiTripPlan?.destination;
        if (destName) {
          uniqueDestinations.add(destName.split(",")[0].trim());
        }
      });

      if (email) {
        try {
          const tripsQuery = query(
            collection(db, "UserTrips"),
            where("userEmail", "==", email)
          );
          const tripsSnap = await getDocs(tripsQuery);
          remoteCount = tripsSnap.size;

          tripsSnap.forEach((doc) => {
            const d = doc.data();
            const destName = d?.tripData?.toLocation?.name || d?.tripData?.destination;
            if (destName) {
              uniqueDestinations.add(destName.split(",")[0].trim());
            }
          });
        } catch (err) {
          console.log("Stats fetch notice (offline/fallback):", err?.message);
        }
      }

      // Query bookings count
      let bookingsCount = 0;
      if (email) {
        try {
          const bookingsQuery = query(
            collection(db, "Bookings"),
            where("userEmail", "==", email)
          );
          const bookingsSnap = await getDocs(bookingsQuery);
          bookingsCount = bookingsSnap.size;
        } catch (e) {}
      }

      const totalTripsCount = Math.max(remoteCount, localTrips.length);

      if (!cancelled) {
        setStats({
          trips: totalTripsCount,
          places: uniqueDestinations.size > 0 ? uniqueDestinations.size : (totalTripsCount > 0 ? totalTripsCount * 2 : 0),
          bookings: bookingsCount,
        });
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [userData]);

  const toggleTheme = () => {
    triggerHaptic();
    setPreferences((prev) => ({
      ...prev,
      darkMode: !prev?.darkMode,
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
      return { title: "Elite Globetrotter", level: "Tier 3", icon: "diamond-outline", color: "#8B5CF6" };
    }
    if (stats.trips >= 1) {
      return { title: "Voyager Pro", level: "Tier 2", icon: "compass-outline", color: "#10B981" };
    }
    return { title: "Novice Explorer", level: "Tier 1", icon: "sparkles-outline", color: Colors.PRIMARY };
  };

  const tier = getExplorerTier();

  // Unified Calm Luxury Brand Icon Styling (Theme-aware)
  const brandIconColor = theme.isDark ? "#38BDF8" : Colors.PRIMARY;
  const brandIconBg = theme.isDark ? "rgba(56, 189, 248, 0.12)" : "rgba(10, 126, 164, 0.08)";
  const brandBorderColor = theme.isDark ? "rgba(56, 189, 248, 0.22)" : "rgba(10, 126, 164, 0.14)";

  // Menu Groups
  const travelHubItems = [
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
      onPress: () => Linking.openURL("https://dist-seven-tau-79.vercel.app/privacy"),
    },
    {
      id: "terms",
      title: "Terms of Service",
      subtitle: "AI disclaimer, bookings & terms of use",
      icon: "document-text-outline",
      onPress: () => Linking.openURL("https://dist-seven-tau-79.vercel.app/terms"),
    },
  ];

  const renderMenuItem = (item, isLast) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.isDark ? "#282828" : "#F0F0F0" },
      ]}
      onPress={() => handleNavigate(item)}
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
        <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.menuSubtitle, { color: theme.subtext }]}>{item.subtitle}</Text>
      </View>
      {item.badge && (
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.isDark ? "#666" : "#B0B0B0"}
        style={{ marginLeft: 6 }}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.isDark ? "#242424" : "#F0F0F0" }]}>
        <Text style={[styles.headerTitle, { color: theme.isDark ? theme.text : Colors.PRIMARY }]}>
          Profile
        </Text>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeToggleBtn, { backgroundColor: theme.isDark ? "#2A2A2A" : "#F3F4F6" }]}
          accessibilityLabel="Toggle Dark Mode"
        >
          <Ionicons
            name={theme.isDark ? "sunny" : "moon"}
            size={20}
            color={theme.isDark ? "#FBBF24" : "#4B5563"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Identity Card */}
        <View style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatarAction}
            activeOpacity={0.8}
            accessibilityLabel="Change Profile Photo"
          >
            <Image
              source={{
                uri: userData?.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
              }}
              style={styles.avatar}
            />
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.userName, { color: theme.text }]}>
            {userData?.name || "Traveler"}
          </Text>
          <Text style={[styles.userEmail, { color: theme.subtext }]}>
            {userData?.email || "user@example.com"}
          </Text>

          {/* Explorer Tier Pill */}
          <View style={[styles.tierPill, { backgroundColor: `${tier.color}15`, borderColor: `${tier.color}40` }]}>
            <Ionicons name={tier.icon} size={14} color={tier.color} />
            <Text style={[styles.tierText, { color: tier.color }]}>
              {tier.title} • {tier.level}
            </Text>
          </View>
        </View>

        {/* Travel Stats Bar */}
        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.statCol}
            onPress={() => handleNavigate("/mytrip")}
            activeOpacity={0.7}
          >
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.trips}</Text>
            <Text style={[styles.statLabel, { color: theme.subtext }]}>Trips</Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: theme.isDark ? "#2C2C2C" : "#E5E7EB" }]} />

          <TouchableOpacity
            style={styles.statCol}
            onPress={() => handleNavigate("/explore")}
            activeOpacity={0.7}
          >
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.places}</Text>
            <Text style={[styles.statLabel, { color: theme.subtext }]}>Places</Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: theme.isDark ? "#2C2C2C" : "#E5E7EB" }]} />

          <TouchableOpacity
            style={styles.statCol}
            onPress={() => handleNavigate("/my-bookings")}
            activeOpacity={0.7}
          >
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.bookings}</Text>
            <Text style={[styles.statLabel, { color: theme.subtext }]}>Bookings</Text>
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
              { borderBottomWidth: 1, borderBottomColor: theme.isDark ? "#282828" : "#F0F0F0" },
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
              trackColor={{ false: theme.isDark ? "#333" : "#D1D5DB", true: Colors.PRIMARY }}
              thumbColor="#FFFFFF"
            />
          </View>
          {settingsItems.map((item, idx) => renderMenuItem(item, idx === settingsItems.length - 1))}
        </View>

        {/* Section 4: Sign Out */}
        <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
          <TouchableOpacity
            style={styles.signOutRow}
            onPress={handleSignOut}
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
              <Ionicons name="log-out-outline" size={20} color={theme.isDark ? "#F87171" : "#DC2626"} />
            </View>
            <Text style={[styles.signOutText, { color: theme.isDark ? "#F87171" : "#DC2626" }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footerWrap}>
          <Text style={[styles.footerText, { color: theme.subtext }]}>GoGuide AI Agent • Version 1.0.0</Text>
          <Text style={[styles.footerSubtext, { color: theme.isDark ? "#555" : "#AAA" }]}>
            Cloud Synced • Offline Capable • Built for Travelers
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
  },
  themeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  userCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: "#000",
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
    borderColor: "#FFFFFF",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
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
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Outfit-Medium",
    color: "#DC2626",
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
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    marginTop: 3,
  },
});
