import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../Components/constants/constants';
import { useTheme } from '../Components/constants/theme';
import { CreateTripContext } from '../context/CreateTripContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../Configs/FirebaseConfig';

const QUICK_CITIES = [
  { name: "Tokyo", country: "Japan", lat: 35.6764, lng: 139.65 },
  { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { name: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
  { name: "Bali", country: "Indonesia", lat: -8.4095, lng: 115.1889 },
  { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
  { name: "New York", country: "USA", lat: 40.7128, lng: -74.0060 },
];

const getWeatherMeta = (code) => {
  if (code === 0) return { label: "Sunny / Clear Sky", icon: "sunny", color: "#F59E0B" };
  if (code <= 3) return { label: "Partly Cloudy", icon: "partly-sunny", color: "#3B82F6" };
  if (code <= 48) return { label: "Foggy / Mist", icon: "cloudy", color: "#6B7280" };
  if (code <= 67) return { label: "Rainy", icon: "rainy", color: "#2563EB" };
  if (code <= 77) return { label: "Snowy", icon: "snow", color: "#38BDF8" };
  if (code <= 82) return { label: "Rain Showers", icon: "rainy", color: "#0284C7" };
  if (code <= 99) return { label: "Thunderstorm", icon: "thunderstorm", color: "#8B5CF6" };
  return { label: "Pleasant", icon: "partly-sunny", color: "#F59E0B" };
};

export default function LocationPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { userData, setUserData, uid } = useContext(CreateTripContext);

  const safeTopPadding = Platform.select({
    android: Math.max(insets.top, StatusBar.currentHeight || 28) + 8,
    ios: Math.max(insets.top, 44),
    default: 16,
  });

  const initialLoc = userData?.userLocation || {
    name: "Tokyo, Japan",
    coordinates: { lat: 35.6764, lng: 139.65 },
  };

  const [activeLocation, setActiveLocation] = useState(initialLoc);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const lat = activeLocation.coordinates?.lat || activeLocation.lat;
    const lng = activeLocation.coordinates?.lng || activeLocation.lng;
    if (lat && lng) {
      fetchWeather(lat, lng);
    }
  }, []);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  const fetchWeather = async (lat, lon) => {
    try {
      setWeatherLoading(true);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      );
      const data = await response.json();
      setWeather(data.current_weather);
    } catch (error) {
      console.log("Weather error:", error);
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleSelectQuickCity = (city) => {
    triggerHaptic();
    const loc = {
      name: `${city.name}, ${city.country}`,
      coordinates: { lat: city.lat, lng: city.lng },
    };
    setActiveLocation(loc);
    fetchWeather(city.lat, city.lng);
  };

  const searchPlace = (text) => {
    setSearchQuery(text);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (text.length < 3) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${text}&addressdetails=1&accept-language=en`,
          {
            headers: {
              "User-Agent": "GoGuideApp/1.0",
            },
          }
        );
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.log("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const selectLocation = async (item) => {
    triggerHaptic();
    const location = {
      name: item.display_name,
      coordinates: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      },
    };

    setActiveLocation(location);
    setSearchQuery("");
    setResults([]);
    fetchWeather(location.coordinates.lat, location.coordinates.lng);

    if (uid) {
      try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, { userLocation: location });
        setUserData((prev) => ({ ...prev, userLocation: location }));
      } catch (error) {
        console.log("Error updating location:", error);
      }
    }
  };

  const weatherMeta = weather ? getWeatherMeta(weather.weathercode) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: safeTopPadding }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          style={[styles.backBtn, { backgroundColor: theme.card }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Live Weather Forecast</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            Real-time conditions via Open-Meteo
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Active Weather Card */}
        <View style={[styles.weatherCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.weatherHeader}>
            <View style={[styles.locIconWrap, { backgroundColor: Colors.PRIMARY + "18" }]}>
              <Ionicons name="location" size={18} color={Colors.PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationName, { color: theme.text }]} numberOfLines={1}>
                {activeLocation.name?.split(',')[0]}
              </Text>
              <Text style={[styles.locationCountry, { color: theme.subtext }]} numberOfLines={1}>
                {activeLocation.name?.split(',').slice(1).join(',').trim() || "Live Destination"}
              </Text>
            </View>
          </View>

          {weatherLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.PRIMARY} size="large" />
              <Text style={[styles.loadingText, { color: theme.subtext }]}>Fetching live forecast...</Text>
            </View>
          ) : weather ? (
            <View style={styles.weatherInfo}>
              <View style={styles.tempRow}>
                <Ionicons
                  name={weatherMeta?.icon || "partly-sunny"}
                  size={52}
                  color={weatherMeta?.color || "#F59E0B"}
                  style={{ marginRight: 12 }}
                />
                <Text style={[styles.temp, { color: theme.text }]}>{Math.round(weather.temperature)}°C</Text>
              </View>

              <View
                style={[
                  styles.conditionBadge,
                  { backgroundColor: (weatherMeta?.color || Colors.PRIMARY) + "18" },
                ]}
              >
                <Text style={[styles.conditionText, { color: weatherMeta?.color || Colors.PRIMARY }]}>
                  {weatherMeta?.label || "Pleasant Travel Conditions"}
                </Text>
              </View>

              {/* Metrics Row */}
              <View style={[styles.metricsRow, { borderTopColor: theme.border }]}>
                <View style={styles.metricItem}>
                  <Ionicons name="speedometer-outline" size={18} color={theme.subtext} />
                  <Text style={[styles.metricVal, { color: theme.text }]}>{weather.windspeed} km/h</Text>
                  <Text style={[styles.metricLabel, { color: theme.subtext }]}>Wind Speed</Text>
                </View>

                <View style={styles.metricItem}>
                  <Ionicons name="compass-outline" size={18} color={theme.subtext} />
                  <Text style={[styles.metricVal, { color: theme.text }]}>{weather.winddirection}°</Text>
                  <Text style={[styles.metricLabel, { color: theme.subtext }]}>Direction</Text>
                </View>

                <View style={styles.metricItem}>
                  <Ionicons name="time-outline" size={18} color={theme.subtext} />
                  <Text style={[styles.metricVal, { color: theme.text }]}>Realtime</Text>
                  <Text style={[styles.metricLabel, { color: theme.subtext }]}>Updated</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={[styles.noWeather, { color: theme.subtext }]}>Select a destination to view live weather</Text>
          )}
        </View>

        {/* Popular Travel Hubs Quick Chips */}
        <Text style={[styles.label, { color: theme.text }]}>Popular Destinations</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickCitiesRow}
        >
          {QUICK_CITIES.map((city) => {
            const isActive = activeLocation.name?.toLowerCase().includes(city.name.toLowerCase());
            return (
              <TouchableOpacity
                key={city.name}
                onPress={() => handleSelectQuickCity(city)}
                style={[
                  styles.cityChip,
                  isActive
                    ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
                    : { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    { color: isActive ? "#FFF" : theme.text, fontFamily: isActive ? "Outfit-Bold" : "Outfit-Medium" },
                  ]}
                >
                  {city.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search City / Destination */}
        <Text style={[styles.label, { color: theme.text, marginTop: 22 }]}>Search Any City or Area</Text>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.subtext} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Search Tokyo, Paris, Dubai, London..."
            placeholderTextColor={theme.subtext}
            value={searchQuery}
            onChangeText={searchPlace}
          />
          {loading && <ActivityIndicator size="small" color={Colors.PRIMARY} />}
        </View>

        {results.length > 0 && (
          <View style={[styles.resultsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {results.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.resultItem, { borderBottomColor: theme.border }]}
                onPress={() => selectLocation(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="pin" size={18} color={Colors.PRIMARY} style={{ marginRight: 10 }} />
                <Text style={[styles.resultText, { color: theme.text }]} numberOfLines={2}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit-Regular',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  weatherCard: {
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationName: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
  },
  locationCountry: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 1,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    marginTop: 10,
  },
  weatherInfo: {
    alignItems: 'center',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  temp: {
    fontSize: 54,
    fontFamily: 'Outfit-Bold',
  },
  conditionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 18,
  },
  conditionText: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'Outfit-Regular',
    marginTop: 2,
  },
  noWeather: {
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    marginVertical: 15,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    marginBottom: 10,
  },
  quickCitiesRow: {
    gap: 8,
    paddingBottom: 6,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: 13,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
  },
  resultsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 6,
    borderWidth: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    flex: 1,
  },
});
