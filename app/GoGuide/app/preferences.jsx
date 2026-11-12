import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Colors } from "../Components/constants/constants";
import { Radius, Spacing, Typography, lightTheme, useTheme } from "../Components/constants/theme";
import FadeInView from "../Components/ui/FadeInView";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { CreateTripContext } from "../context/CreateTripContext";

import { TouchableOpacity } from "../Components/ui/Touchable";
import { goBack } from "../Components/utils/navigation";
const Segments = ({ items, current, onSelect, label }) => {
  const theme = useTheme();
  return (
  <View style={styles.segmentedRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
    {items.map((item) => {
      const isSelected = current === item.value;
      return (
        <TouchableOpacity
          key={item.value}
          accessibilityRole="radio"
          accessibilityLabel={`${label}: ${item.label}`}
          accessibilityState={{ selected: isSelected, checked: isSelected }}
          style={[
            styles.segmentPill,
            isSelected
              ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
              : { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
          onPress={() => onSelect(item.value)}
          activeOpacity={0.75}
        >
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
            style={[styles.segmentText, { color: isSelected ? lightTheme.card : theme.text }]}
          >
            {item.label}
          </Text>
          {isSelected ? <Ionicons name="checkmark" size={14} color={lightTheme.card} style={styles.segmentCheck} /> : null}
        </TouchableOpacity>
      );
    })}
  </View>
);
};

const SettingHeader = ({ icon, title, desc }) => {
  const theme = useTheme();
  return (
  <>
    <View style={[styles.unifiedIconBadge, { backgroundColor: theme.badgeBg }]}>
      <Ionicons name={icon} size={18} color={theme.subtext} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.settingTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>{title}</Text>
      <Text style={[styles.settingDesc, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>{desc}</Text>
    </View>
  </>
);
};

const ToggleRow = ({ icon, title, desc, value, onToggle }) => {
  const theme = useTheme();
  return (
  <View style={styles.toggleRow}>
    <View style={styles.toggleLeft}>
      <SettingHeader icon={icon} title={title} desc={desc} />
    </View>
    <Switch
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: !!value }}
      value={!!value}
      onValueChange={onToggle}
      trackColor={{ false: theme.border, true: Colors.PRIMARY }}
      thumbColor={lightTheme.card}
    />
  </View>
);
};

const Label = ({ children }) => {
  const theme = useTheme();
  return (
  <Text accessibilityRole="header" style={[styles.sectionLabel, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>{children}</Text>
);
};
const Divider = () => {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
};


export default function Preferences() {
  const insets = useSafeAreaInsets();
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

  const badgeBg = theme.badgeBg;

  const cardStyle = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScreenHeader
        title="Preferences"
        subtitle="Customise AI recommendations & display"
        onBack={() => goBack(router)}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 84 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <FadeInView index={0}>
          <Label>AI TRAVEL INTELLIGENCE</Label>
          <View style={cardStyle}>
            <View style={styles.settingBlock}>
              <View style={styles.settingHeaderRow}>
                <SettingHeader icon="restaurant-outline" title="Dining & Dietary Filter" desc="AI prioritises restaurants matching this choice" />
              </View>
              <Segments
                label="Dietary filter"
                current={preferences?.dietary || "Halal"}
                onSelect={(v) => updatePreference("dietary", v)}
                items={[
                  { label: "Halal 🌙", value: "Halal" },
                  { label: "Vegetarian 🥗", value: "Vegetarian" },
                  { label: "Any Food 🍽️", value: "Any" },
                ]}
              />
            </View>
            <Divider />
            <View style={styles.settingBlock}>
              <View style={styles.settingHeaderRow}>
                <SettingHeader icon="speedometer-outline" title="Itinerary Pace" desc="Determines daily schedule density and free time" />
              </View>
              <Segments
                label="Itinerary pace"
                current={preferences?.travelPace || "Balanced"}
                onSelect={(v) => updatePreference("travelPace", v)}
                items={[
                  { label: "Relaxed 🧘", value: "Relaxed" },
                  { label: "Balanced ⚖️", value: "Balanced" },
                  { label: "Packed ⚡", value: "Packed" },
                ]}
              />
            </View>
            <Divider />
            <View style={styles.settingBlock}>
              <View style={styles.settingHeaderRow}>
                <SettingHeader icon="cash-outline" title="Display Currency" desc="Estimated budget & hotel prices" />
              </View>
              <Segments
                label="Display currency"
                current={preferences?.currency || "USD"}
                onSelect={(v) => updatePreference("currency", v)}
                items={[
                  { label: "USD ($)", value: "USD" },
                  { label: "EUR (€)", value: "EUR" },
                  { label: "PKR (Rs)", value: "PKR" },
                  { label: "AED", value: "AED" },
                ]}
              />
            </View>
          </View>
        </FadeInView>

        <FadeInView index={1}>
          <Label>DISPLAY & LOCALISATION</Label>
          <View style={cardStyle}>
            <ToggleRow
              icon={theme.isDark ? "moon" : "moon-outline"}
              title="Dark Mode"
              desc="Deep palette for night reading"
              value={theme.isDark}
              onToggle={() => setPreferences((prev) => ({ ...prev, darkMode: !theme.isDark }))}
            />
            <Divider />
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <SettingHeader icon="thermometer-outline" title="Temperature Unit" desc="Used in destination weather cards" />
              </View>
              <View style={[styles.miniSegment, { backgroundColor: badgeBg }]} accessibilityRole="radiogroup" accessibilityLabel="Temperature unit">
                {["C", "F"].map((unit) => {
                  const active = (preferences?.temperatureUnit || "C") === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      accessibilityRole="radio"
                      accessibilityLabel={unit === "C" ? "Celsius" : "Fahrenheit"}
                      accessibilityState={{ selected: active, checked: active }}
                      style={[styles.miniSegmentPill, active && { backgroundColor: activeAccent }]}
                      onPress={() => updatePreference("temperatureUnit", unit)}
                    >
                      <Text style={[styles.miniSegmentText, { color: active ? lightTheme.card : theme.text }]} maxFontSizeMultiplier={1.3}>
                        °{unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </FadeInView>

        <FadeInView index={2}>
          <Label>NOTIFICATIONS & PRIVACY</Label>
          <View style={cardStyle}>
            <ToggleRow
              icon="notifications-outline"
              title="Trip & Itinerary Updates"
              desc="Daily activity schedule reminders"
              value={preferences?.notifications ?? true}
              onToggle={() => togglePreference("notifications")}
            />
            <Divider />
            <ToggleRow
              icon="warning-outline"
              title="Travel Safety Alerts"
              desc="Severe weather & local advisory warnings"
              value={preferences?.weatherAlerts ?? true}
              onToggle={() => togglePreference("weatherAlerts")}
            />
            <Divider />
            <ToggleRow
              icon="navigate-outline"
              title="Location Services"
              desc="Auto-detect nearby places & restaurants"
              value={preferences?.locationServices ?? true}
              onToggle={() => togglePreference("locationServices")}
            />
          </View>
        </FadeInView>

        <FadeInView index={3}>
          <Label>DATA & STORAGE</Label>
          <View style={cardStyle}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear travel and AI cache"
              accessibilityState={{ disabled: clearingCache, busy: clearingCache }}
              style={styles.clearCacheBtn}
              onPress={handleClearCache}
              disabled={clearingCache}
              activeOpacity={0.7}
            >
              <SettingHeader icon="trash-outline" title="Clear Travel & AI Cache" desc="Frees up local storage without deleting saved trips" />
              <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
            </TouchableOpacity>
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontBold,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    marginTop: Spacing.sm,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  settingBlock: { padding: Spacing.lg },
  settingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  settingTitle: { fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  settingDesc: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, marginTop: 2 },
  segmentedRow: { flexDirection: "row", gap: 6 },
  segmentPill: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 2,
  },
  segmentText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium, textAlign: "center", flexShrink: 1 },
  segmentCheck: { marginLeft: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.lg },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    minHeight: 64,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
    paddingRight: 10,
  },
  miniSegment: { flexDirection: "row", borderRadius: Radius.md, padding: 3, gap: 2 },
  miniSegmentPill: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  miniSegmentText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  clearCacheBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: 64,
  },
  unifiedIconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
