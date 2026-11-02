import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../Components/constants/constants';
import { CreateTripContext } from '../context/CreateTripContext';
import { fetchDestinationSafety } from '../Configs/AiModel';

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
  const router = useRouter();
  const { preferences, tripData } = useContext(CreateTripContext);
  const isDark = preferences?.darkMode;
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState(safetyMockData);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(false);

  const destinationName = tripData?.toLocation?.name || tripData?.destination || tripData?.aiTripPlan?.destination || "Popular Travel Spots";

  const loadAiAlerts = async () => {
    try {
      setAlertsLoading(true);
      const res = await fetchDestinationSafety(destinationName);
      if (res && Array.isArray(res) && res.length > 0) {
        setAlerts(res);
      }
    } catch (e) {
      console.log("Error loading AI safety alerts:", e);
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchWeather = async (isManual = false) => {
    const lat = tripData?.toLocation?.coordinates?.lat || "48.8566"; // Default to Paris if no trip
    const lng = tripData?.toLocation?.coordinates?.lng || "2.3522";

    try {
      setLoading(true);
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
      const data = await res.json();
      if (data && data.current_weather) {
        setWeather(data.current_weather);
      }
    } catch (error) {
      console.log("Error fetching weather for safety:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    loadAiAlerts();
  }, [tripData]);

  // Realistic/Standard mock data for emergency contacts
  const emergencyContacts = [
    { title: "Police / Emergency", number: "911", icon: "shield-outline", color: "#2D3748" },
    { title: "Ambulance / Medical", number: "911", icon: "medical-outline", color: "#D32F2F" },
    { title: "Fire Department", number: "911", icon: "flame-outline", color: "#F57C00" },
    { title: "Traveler Assistance", number: "0318-8444029", icon: "call-outline", color: Colors.PRIMARY || "#0a7ea4" },
  ];

  const handleCall = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`);
  };

  const theme = {
    bg: isDark ? "#121212" : "#F7FAFC",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1A202C",
    subText: isDark ? "#A0A0A0" : "#718096",
    border: isDark ? "#2D2D2D" : "#E2E8F0",
  };

  const getSeverityLabel = (severity, color) => {
    return (
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{severity}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Safety Alerts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Weather Status Card (New Integration) */}
        <View style={[styles.weatherCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.weatherHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="cloud-outline" size={24} color={Colors.PRIMARY || "#0a7ea4"} />
              <Text style={[styles.weatherTitle, { color: theme.text }]}>Destination Weather</Text>
            </View>
            <TouchableOpacity onPress={() => fetchWeather(true)} disabled={loading}>
              <Ionicons name="refresh" size={20} color={loading ? theme.subText : (Colors.PRIMARY || "#0a7ea4")} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={Colors.PRIMARY} size="small" style={{ marginVertical: 10 }} />
          ) : weather ? (
            <View style={styles.weatherInfoRow}>
              <View style={styles.weatherItem}>
                <Text style={[styles.weatherValue, { color: theme.text }]}>{weather.temperature}°C</Text>
                <Text style={[styles.weatherLabel, { color: theme.subText }]}>Temp</Text>
              </View>
              <View style={styles.weatherDivider} />
              <View style={styles.weatherItem}>
                <Text style={[styles.weatherValue, { color: theme.text }]}>{weather.windspeed} km/h</Text>
                <Text style={[styles.weatherLabel, { color: theme.subText }]}>Wind</Text>
              </View>
              <View style={styles.weatherDivider} />
              <View style={styles.weatherItem}>
                <Text style={[styles.weatherValue, { color: theme.text }]}>Stable</Text>
                <Text style={[styles.weatherLabel, { color: theme.subText }]}>Status</Text>
              </View>
            </View>
          ) : (
            <Text style={{ color: theme.subText }}>Weather data unavailable</Text>
          )}
        </View>

        {/* Top Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <Feather name="shield" size={28} color={Colors.WHITE} />
          </View>
          <Text style={styles.infoTitle}>Stay Safe on Your Trip</Text>
          <Text style={styles.infoDesc}>
            Check current advisories and warnings for your destination. In case of emergency, immediately contact local authorities.
          </Text>

          <TouchableOpacity
            style={styles.emergencyBtn}
            onPress={() => setEmergencyVisible(true)}
          >
            <Ionicons name="call" size={18} color={Colors.WHITE} style={{ marginRight: 8 }} />
            <Text style={styles.emergencyText}>View Emergency Contacts</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={emergencyVisible}
          onRequestClose={() => setEmergencyVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Emergency Contacts</Text>
                <TouchableOpacity onPress={() => setEmergencyVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSub, { color: theme.subText }]}>Tapping a number will dial it on your phone.</Text>

              {emergencyContacts.map((contact, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.contactCard, { borderBottomColor: theme.border }]}
                  onPress={() => handleCall(contact.number)}
                >
                  <View style={[styles.contactIcon, { backgroundColor: `${contact.color}15` }]}>
                    <Ionicons name={contact.icon} size={22} color={contact.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactTitle, { color: theme.text }]}>{contact.title}</Text>
                    <Text style={styles.contactNumber}>{contact.number}</Text>
                  </View>
                  <Ionicons name="call" size={20} color={Colors.PRIMARY} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setEmergencyVisible(false)}
              >
                <Text style={styles.closeBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Text style={[styles.sectionHeader, { color: theme.text }]}>Current Advisories</Text>

        {/* Alert Cards */}
        {safetyMockData.map((alert) => (
          <View key={alert.id} style={[styles.alertCard, { backgroundColor: theme.card }]}>
            <View style={[styles.iconWrapper, { backgroundColor: alert.bgColor }]}>
              <Ionicons name={alert.icon} size={28} color={alert.color} />
            </View>
            <View style={styles.alertContent}>
              <View style={styles.alertHeaderRow}>
                <Text style={[styles.alertType, { color: alert.color }]}>{alert.type}</Text>
                {getSeverityLabel(alert.severity, alert.color)}
              </View>
              <Text style={[styles.alertTitle, { color: theme.text }]}>{alert.title}</Text>
              <Text style={[styles.alertDesc, { color: theme.subText }]}>{alert.description}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC', // Very light cool gray
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#1A202C',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoCard: {
    backgroundColor: Colors.PRIMARY || '#0a7ea4',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: Colors.PRIMARY || '#0a7ea4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: Colors.WHITE,
    marginBottom: 10,
    textAlign: 'center',
  },
  infoDesc: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F', // Red for emergency
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  emergencyText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: Colors.WHITE,
  },
  sectionHeader: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#2D3748',
    marginBottom: 15,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: Colors.WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  alertContent: {
    flex: 1,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertType: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.WHITE,
    fontFamily: 'Outfit-Medium',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  alertTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#1A202C',
    marginBottom: 6,
  },
  alertDesc: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  weatherCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  weatherTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginLeft: 10,
  },
  weatherInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  weatherItem: {
    alignItems: 'center',
  },
  weatherValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  weatherLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  weatherDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 25,
  },
  modalContent: {
    padding: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
  },
  modalSub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  contactNumber: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    color: Colors.PRIMARY,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeBtnText: {
    color: '#FFF',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
});
