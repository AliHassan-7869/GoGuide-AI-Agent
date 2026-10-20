import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../Components/constants/constants";
import { useTheme } from "../Components/constants/theme";
import { CreateTripContext } from "../context/CreateTripContext";

export default function Preferences() {
  const router = useRouter();
  const { preferences, setPreferences } = useContext(CreateTripContext);
  const theme = useTheme();
  const [clearingCache, setClearingCache] = useState(false);

  const activeAccent = Colors.PRIMARY || "#0F172A";

  const updatePreference = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleClearCache = async () => {
    Alert.alert(
      "Clear Travel Cache",
      "This will remove temporary offline trip cache and AI draft memory. Your saved trips will remain safe.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setClearingCache(true);
            try {
              await AsyncStorage.removeItem("goguide_ai_copilot_chat_v1");
              Alert.alert("Success", "Temporary cache cleared successfully.");
            } catch (e) {
              console.warn("Could not clear cache:", e);
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const badgeBg = theme.isDark ? "#222232" : "#F1F5F9";
  const iconColor = theme.isDark ? "#CBD5E1" : "#475569";

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
        <View>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.isDark ? theme.text : activeAccent },
            ]}
          >
            Preferences
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.isDark ? "#94A3B8" : "#64748B" },
            ]}
          >
            Customize AI recommendations & display
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: AI TRAVEL INTELLIGENCE */}
        <Text style={[styles.sectionLabel, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
          AI TRAVEL INTELLIGENCE
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.isDark ? "#262638" : "#E2E8F0",
            },
          ]}
        >
          {/* Dietary Preference */}
          <View style={styles.settingBlock}>
            <View style={styles.settingHeaderRow}>
              <View style={[styles.unifiedIconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name="restaurant-outline" size={18} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Dining & Dietary Filter
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  AI prioritizes restaurants matching this choice
                </Text>
              </View>
            </View>

            <View style={styles.segmentedRow}>
              {[
                { label: "Halal 🌙", value: "Halal" },
                { label: "Vegetarian 🥗", value: "Vegetarian" },
                { label: "Any Food 🍽️", value: "Any" },
              ].map((item) => {
                const isSelected = (preferences?.dietary || "Halal") === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.segmentPill,
                      isSelected
                        ? { backgroundColor: activeAccent, borderColor: activeAccent }
                        : {
                            backgroundColor: theme.isDark ? "#20202E" : "#F8FAFC",
                            borderColor: theme.isDark ? "#2D2D42" : "#E2E8F0",
                          },
                    ]}
                    onPress={() => updatePreference("dietary", item.value)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: isSelected ? "#FFFFFF" : theme.isDark ? "#CBD5E1" : "#475569" },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Travel Pace */}
          <View style={styles.settingBlock}>
            <View style={styles.settingHeaderRow}>
              <View style={[styles.unifiedIconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name="speedometer-outline" size={18} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Itinerary Pace
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Determines daily schedule density and free time
                </Text>
              </View>
            </View>

            <View style={styles.segmentedRow}>
              {[
                { label: "Relaxed 🧘", value: "Relaxed" },
                { label: "Balanced ⚖️", value: "Balanced" },
                { label: "Packed ⚡", value: "Packed" },
              ].map((item) => {
                const isSelected = (preferences?.travelPace || "Balanced") === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.segmentPill,
                      isSelected
                        ? { backgroundColor: activeAccent, borderColor: activeAccent }
                        : {
                            backgroundColor: theme.isDark ? "#20202E" : "#F8FAFC",
                            borderColor: theme.isDark ? "#2D2D42" : "#E2E8F0",
                          },
                    ]}
                    onPress={() => updatePreference("travelPace", item.value)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: isSelected ? "#FFFFFF" : theme.isDark ? "#CBD5E1" : "#475569" },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Preferred Currency */}
          <View style={styles.settingBlock}>
            <View style={styles.settingHeaderRow}>
              <View style={[styles.unifiedIconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name="cash-outline" size={18} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Display Currency
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Estimated budget & hotel prices
                </Text>
              </View>
            </View>

            <View style={styles.segmentedRow}>
              {[
                { label: "USD ($)", value: "USD" },
                { label: "EUR (€)", value: "EUR" },
                { label: "PKR (Rs)", value: "PKR" },
                { label: "AED", value: "AED" },
              ].map((item) => {
                const isSelected = (preferences?.currency || "USD") === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.segmentPill,
                      isSelected
                        ? { backgroundColor: activeAccent, borderColor: activeAccent }
                        : {
                            backgroundColor: theme.isDark ? "#20202E" : "#F8FAFC",
                            borderColor: theme.isDark ? "#2D2D42" : "#E2E8F0",
                          },
                    ]}
                    onPress={() => updatePreference("currency", item.value)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: isSelected ? "#FFFFFF" : theme.isDark ? "#CBD5E1" : "#475569" },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* SECTION 2: DISPLAY & LOCALIZATION */}
        <Text style={[styles.sectionLabel, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
          DISPLAY & LOCALIZATION
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.isDark ? "#262638" : "#E2E8F0",
            },
          ]}
        >
          {/* Dark Mode */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.unifiedIconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons
                  name={preferences?.darkMode ? "moon" : "moon-outline"}
                  size={18}
                  color={iconColor}
                />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Dark Mode
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Deep palette for night reading
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.darkMode ?? false}
              onValueChange={() => togglePreference("darkMode")}
              trackColor={{ false: "#CBD5E1", true: activeAccent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Temperature Units */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.unifiedIconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name="thermometer-outline" size={18} color={iconColor} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Temperature Unit
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Used in destination weather cards
                </Text>
              </View>
            </View>

            <View style={[styles.miniSegment, { backgroundColor: badgeBg }]}>
              {["C", "F"].map((unit) => {
                const active = (preferences?.temperatureUnit || "C") === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.miniSegmentPill,
                      active && { backgroundColor: activeAccent },
                    ]}
                    onPress={() => updatePreference("temperatureUnit", unit)}
                  >
                    <Text
                      style={[
                        styles.miniSegmentText,
                        { color: active ? "#FFFFFF" : iconColor },
                      ]}
                    >
                      °{unit}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* SECTION 3: NOTIFICATIONS & ALERTS */}
        <Text style={[styles.sectionLabel, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
          NOTIFICATIONS & PRIVACY
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.isDark ? "#262638" : "#E2E8F0",
            },
          ]}
        >
          {/* Push Notifications */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.unifiedIconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name="notifications-outline" size={18} color={iconColor} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Trip & Itinerary Updates
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Daily activity schedule reminders
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.notifications ?? true}
              onValueChange={() => togglePreference("notifications")}
              trackColor={{ false: "#CBD5E1", true: activeAccent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Severe Weather & Safety */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.unifiedIconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name="warning-outline" size={18} color={iconColor} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Travel Safety Alerts
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Severe weather & local advisory warnings
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.weatherAlerts ?? true}
              onValueChange={() => togglePreference("weatherAlerts")}
              trackColor={{ false: "#CBD5E1", true: activeAccent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Location Services */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.unifiedIconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name="navigate-outline" size={18} color={iconColor} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Location Services
                </Text>
                <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                  Auto-detect nearby places & restaurants
                </Text>
              </View>
            </View>
            <Switch
              value={preferences?.locationServices ?? true}
              onValueChange={() => togglePreference("locationServices")}
              trackColor={{ false: "#CBD5E1", true: activeAccent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* SECTION 4: STORAGE & CACHE */}
        <Text style={[styles.sectionLabel, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
          DATA & STORAGE
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.isDark ? "#262638" : "#E2E8F0",
            },
          ]}
        >
          <TouchableOpacity
            style={styles.clearCacheBtn}
            onPress={handleClearCache}
            disabled={clearingCache}
            activeOpacity={0.7}
          >
            <View style={[styles.unifiedIconBadge, { backgroundColor: badgeBg }]}>
              <Ionicons name="trash-outline" size={18} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Clear Travel & AI Cache
              </Text>
              <Text style={[styles.settingDesc, { color: theme.subtext }]}>
                Frees up local storage without deleting saved trips
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  settingBlock: {
    padding: 16,
  },
  settingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  settingDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  segmentPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  miniSegment: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  miniSegmentPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  miniSegmentText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  clearCacheBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  unifiedIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
