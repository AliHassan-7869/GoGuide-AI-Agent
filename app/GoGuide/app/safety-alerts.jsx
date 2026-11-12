import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from 'expo-router';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../Components/constants/constants';
import { Radius, Spacing, Typography, useTheme } from '../Components/constants/theme';
import EmptyState from '../Components/ui/EmptyState';
import FadeInView from '../Components/ui/FadeInView';
import { Skeleton, SkeletonCard } from '../Components/ui/Skeleton';
import { CreateTripContext } from '../context/CreateTripContext';
import { fetchDestinationSafety } from '../Configs/AiModel';
import ScreenHeader from '../Components/ui/ScreenHeader';

import { TouchableOpacity } from "../Components/ui/Touchable";
// Fallback Standard Data for Safety Alerts
const safetyMockData = [
  {
    id: 1,
    type: 'Travel Advisory',
    title: 'Keep Valuables Secure',
    description: 'Keep your passport, cards, and primary phone secure in zipped pockets in busy public places.',
    severity: 'Medium',
    icon: 'shield-outline',
    color: '#F57C00',
    bgColor: '#FFF3E0',
  },
  {
    id: 2,
    type: 'Local Scam Warning',
    title: 'Verify Taxi Meters & Fares',
    description: 'Always confirm the meter is active or agree on the fare via an official ride-hailing app before departing.',
    severity: 'Medium',
    icon: 'warning-outline',
    color: '#F57C00',
    bgColor: '#FFF3E0',
  },
  {
    id: 3,
    type: 'Health & Hydration',
    title: 'Stay Hydrated & Weather-Ready',
    description: 'Carry drinking water and check daily UV and rain forecasts before heading out on walking tours.',
    severity: 'Low',
    icon: 'medkit-outline',
    color: '#388E3C',
    bgColor: '#E8F5E9',
  }
];

export default function SafetyAlerts() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { tripData } = useContext(CreateTripContext);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [alerts, setAlerts] = useState(safetyMockData);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(false);

  const destinationName = tripData?.toLocation?.name || tripData?.destination || tripData?.aiTripPlan?.destination || "Popular Travel Spots";

  const loadAiAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true);
      const res = await fetchDestinationSafety(destinationName);
      if (res && Array.isArray(res) && res.length > 0) {
        setAlerts(res);
        setUsingFallback(false);
      } else {
        setUsingFallback(true);
      }
    } catch (e) {
      console.log("Error loading AI safety alerts:", e);
      setUsingFallback(true);
    } finally {
      setAlertsLoading(false);
    }
  }, [destinationName]);

  const fetchWeather = useCallback(async () => {
    const lat = tripData?.toLocation?.coordinates?.lat || "48.8566"; // Default to Paris if no trip
    const lng = tripData?.toLocation?.coordinates?.lng || "2.3522";

    try {
      setLoading(true);
      setWeatherError(false);
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
      const data = await res.json();
      if (data && data.current_weather) {
        setWeather(data.current_weather);
      } else {
        setWeatherError(true);
      }
    } catch (error) {
      console.log("Error fetching weather for safety:", error);
      setWeatherError(true);
    } finally {
      setLoading(false);
    }
  }, [tripData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWeather();
      loadAiAlerts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchWeather, loadAiAlerts]);

  const emergencyContacts = [
    { title: "Police / Emergency", number: "911", icon: "shield-outline", color: theme.text },
    { title: "Ambulance / Medical", number: "911", icon: "medical-outline", color: Colors.ERROR },
    { title: "Fire Department", number: "911", icon: "flame-outline", color: Colors.SECONDARY },
    { title: "Traveller Assistance", number: "0318-8444029", icon: "call-outline", color: Colors.PRIMARY },
  ];

  const handleCall = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`);
  };

  const list = alerts && alerts.length > 0 ? alerts : safetyMockData;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="Safety Alerts"
        subtitle="Travel advisories, weather & emergency contacts"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 84 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <FadeInView index={0} style={[styles.weatherCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.weatherHeader}>
            <Ionicons name="cloud-outline" size={24} color={Colors.PRIMARY} />
            <Text style={[styles.weatherTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Destination Weather</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Refresh weather"
              accessibilityState={{ disabled: loading }}
              onPress={fetchWeather}
              disabled={loading}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="refresh" size={20} color={loading ? theme.subtext : Colors.PRIMARY} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.weatherInfoRow}>
              <Skeleton width="28%" height={40} />
              <Skeleton width="28%" height={40} />
              <Skeleton width="28%" height={40} />
            </View>
          ) : weather ? (
            <View style={styles.weatherInfoRow}>
              <View style={styles.weatherItem}>
                <Text style={[styles.weatherValue, { color: theme.text }]} maxFontSizeMultiplier={1.3}>{weather.temperature}°C</Text>
                <Text style={[styles.weatherLabel, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>Temp</Text>
              </View>
              <View style={[styles.weatherDivider, { backgroundColor: theme.border }]} />
              <View style={styles.weatherItem}>
                <Text style={[styles.weatherValue, { color: theme.text }]} maxFontSizeMultiplier={1.3}>{weather.windspeed} km/h</Text>
                <Text style={[styles.weatherLabel, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>Wind</Text>
              </View>
              <View style={[styles.weatherDivider, { backgroundColor: theme.border }]} />
              <View style={styles.weatherItem}>
                <Text style={[styles.weatherValue, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Stable</Text>
                <Text style={[styles.weatherLabel, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>Status</Text>
              </View>
            </View>
          ) : (
            <View style={styles.weatherErrorRow}>
              <Text style={[styles.weatherLabel, { color: theme.subtext, flex: 1 }]} maxFontSizeMultiplier={1.3}>
                {weatherError ? "Weather data unavailable. Check your connection." : "Weather data unavailable"}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Retry loading weather"
                onPress={fetchWeather}
                style={[styles.retryBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.retryText, { color: Colors.PRIMARY }]} maxFontSizeMultiplier={1.3}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </FadeInView>

        <FadeInView index={1} style={[styles.infoCard, { backgroundColor: Colors.PRIMARY }]}>
          <View style={styles.iconCircle}>
            <Feather name="shield" size={28} color={Colors.WHITE} />
          </View>
          <Text style={styles.infoTitle} maxFontSizeMultiplier={1.3}>Stay Safe on Your Trip</Text>
          <Text style={styles.infoDesc} maxFontSizeMultiplier={1.3}>
            Check current advisories and warnings for your destination. In case of emergency, immediately contact local authorities.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={emergencyVisible ? "Hide emergency contacts" : "View emergency contacts"}
            accessibilityState={{ expanded: emergencyVisible }}
            style={[styles.emergencyBtn, { backgroundColor: Colors.ERROR }]}
            onPress={() => setEmergencyVisible((v) => !v)}
          >
            <Ionicons name={emergencyVisible ? "chevron-up" : "call"} size={18} color={Colors.WHITE} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.emergencyText} maxFontSizeMultiplier={1.3}>
              {emergencyVisible ? "Hide Emergency Contacts" : "View Emergency Contacts"}
            </Text>
          </TouchableOpacity>
        </FadeInView>

        {emergencyVisible ? (
          <FadeInView index={0} style={[styles.emergencyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text accessibilityRole="header" style={[styles.modalTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Emergency Contacts</Text>
            <Text style={[styles.modalSub, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>Tapping a number will dial it on your phone.</Text>
            {emergencyContacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Call ${contact.title} on ${contact.number}`}
                style={[styles.contactCard, { borderBottomColor: theme.border }]}
                onPress={() => handleCall(contact.number)}
              >
                <View style={[styles.contactIcon, { backgroundColor: theme.badgeBg }]}>
                  <Ionicons name={contact.icon} size={22} color={contact.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>{contact.title}</Text>
                  <Text style={[styles.contactNumber, { color: Colors.PRIMARY }]} maxFontSizeMultiplier={1.3}>{contact.number}</Text>
                </View>
                <Ionicons name="call" size={20} color={Colors.PRIMARY} />
              </TouchableOpacity>
            ))}
          </FadeInView>
        ) : null}

        <Text accessibilityRole="header" style={[styles.sectionHeader, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Current Advisories</Text>

        {alertsLoading ? (
          <>
            <SkeletonCard imageHeight={56} style={styles.skeletonCard} />
            <SkeletonCard imageHeight={56} style={styles.skeletonCard} />
          </>
        ) : (
          <>
            {usingFallback ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="Showing standard advisories"
                text="We could not load destination-specific alerts. General travel safety tips are shown below."
                actionLabel="Try again"
                onAction={loadAiAlerts}
                style={styles.inlineState}
              />
            ) : null}
            {list.map((alert, index) => (
              <FadeInView
                key={alert.id ?? index}
                index={index}
                style={[styles.alertCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={[styles.iconWrapper, { backgroundColor: `${alert.color || Colors.PRIMARY}26` }]}>
                  <Ionicons name={alert.icon || "alert-circle-outline"} size={28} color={alert.color || Colors.PRIMARY} />
                </View>
                <View style={styles.alertContent}>
                  <View style={styles.alertHeaderRow}>
                    <Text style={[styles.alertType, { color: alert.color || Colors.PRIMARY }]} maxFontSizeMultiplier={1.3}>{alert.type}</Text>
                    <View style={[styles.badge, { backgroundColor: alert.color || Colors.PRIMARY }]}>
                      <Text style={styles.badgeText} maxFontSizeMultiplier={1.3}>{alert.severity}</Text>
                    </View>
                  </View>
                  <Text style={[styles.alertTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>{alert.title}</Text>
                  <Text style={[styles.alertDesc, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>{alert.description}</Text>
                </View>
              </FadeInView>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.lg,
  },
  infoCard: {
    borderRadius: Radius.card,
    padding: Spacing.xxl,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontFamily: Typography.fontBold,
    fontSize: Typography.sizeXl,
    color: Colors.WHITE,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  infoDesc: {
    fontFamily: Typography.fontRegular,
    fontSize: Typography.sizeMd,
    color: Colors.WHITE,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emergencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
  },
  emergencyText: {
    fontFamily: Typography.fontBold,
    fontSize: Typography.sizeMd,
    color: Colors.WHITE,
  },
  emergencyCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    fontFamily: Typography.fontBold,
    fontSize: Typography.sizeXl,
    marginBottom: Spacing.md,
  },
  skeletonCard: { marginBottom: Spacing.lg },
  inlineState: { paddingVertical: Spacing.lg },
  alertCard: {
    flexDirection: "row",
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  alertContent: { flex: 1, minWidth: 0 },
  alertHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 6,
  },
  alertType: {
    flexShrink: 1,
    fontFamily: Typography.fontBold,
    fontSize: Typography.sizeSm,
    textTransform: "uppercase",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  badgeText: {
    color: Colors.WHITE,
    fontFamily: Typography.fontMedium,
    fontSize: Typography.sizeSm,
    textTransform: "uppercase",
  },
  alertTitle: {
    fontFamily: Typography.fontBold,
    fontSize: Typography.sizeBase,
    marginBottom: 6,
  },
  alertDesc: {
    fontFamily: Typography.fontRegular,
    fontSize: Typography.sizeMd,
    lineHeight: 20,
  },
  weatherCard: {
    padding: Spacing.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  weatherHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  weatherTitle: {
    flex: 1,
    fontFamily: Typography.fontBold,
    fontSize: Typography.sizeBase,
    marginLeft: Spacing.md,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  weatherInfoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  weatherErrorRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { fontFamily: Typography.fontMedium, fontSize: Typography.sizeMd },
  weatherItem: { alignItems: "center", flex: 1 },
  weatherValue: { fontFamily: Typography.fontBold, fontSize: Typography.sizeLg },
  weatherLabel: { fontFamily: Typography.fontRegular, fontSize: Typography.sizeMd, marginTop: 2 },
  weatherDivider: { width: 1, height: 30 },
  modalTitle: { fontFamily: Typography.fontBold, fontSize: Typography.sizeLg },
  modalSub: { fontFamily: Typography.fontRegular, fontSize: Typography.sizeMd, marginBottom: Spacing.md, marginTop: 2 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  contactTitle: { fontFamily: Typography.fontBold, fontSize: Typography.sizeBase },
  contactNumber: { fontFamily: Typography.fontMedium, fontSize: Typography.sizeMd, marginTop: 2 },
});
