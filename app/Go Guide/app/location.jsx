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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '../Components/constants/constants';
import { useTheme } from '../Components/constants/theme';
import { CreateTripContext } from '../context/CreateTripContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../Configs/FirebaseConfig';

export default function LocationPage() {
  const router = useRouter();
  const theme = useTheme();
  const { userData, setUserData, uid } = useContext(CreateTripContext);

  const [searchQuery, setSearchQuery] = useState(userData?.userLocation?.name || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (userData?.userLocation?.coordinates) {
        fetchWeather(userData.userLocation.coordinates.lat, userData.userLocation.coordinates.lng);
    }
  }, []);

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
              "User-Agent": "TripPlannerApp/1.0",
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
    const location = {
      name: item.display_name,
      coordinates: {
        lat: item.lat,
        lng: item.lon,
      },
    };

    setSearchQuery(item.display_name);
    setResults([]);
    
    if (uid) {
        try {
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, { userLocation: location });
            setUserData(prev => ({ ...prev, userLocation: location }));
            fetchWeather(location.coordinates.lat, location.coordinates.lng);
            Alert.alert("Success", "Home location updated!");
        } catch (error) {
            console.log("Error updating location:", error);
            Alert.alert("Error", "Failed to save location.");
        }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Personal Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Current Weather Section */}
        {userData?.userLocation && (
            <View style={[styles.weatherCard, { backgroundColor: theme.card }]}>
                <View style={styles.weatherHeader}>
                    <Ionicons name="location-outline" size={20} color={Colors.PRIMARY} />
                    <Text style={[styles.locationName, { color: theme.text }]} numberOfLines={1}>
                        {userData.userLocation.name.split(',')[0]}
                    </Text>
                </View>

                {weatherLoading ? (
                    <ActivityIndicator color={Colors.PRIMARY} style={{ marginVertical: 20 }} />
                ) : weather ? (
                    <View style={styles.weatherInfo}>
                        <Text style={[styles.temp, { color: theme.text }]}>{weather.temperature}°C</Text>
                        <Text style={[styles.weatherDesc, { color: theme.subtext }]}>
                            Wind speed: {weather.windspeed} km/h
                        </Text>
                    </View>
                ) : (
                    <Text style={[styles.noWeather, { color: theme.subtext }]}>Select a location to see weather</Text>
                )}
            </View>
        )}

        <Text style={[styles.label, { color: theme.subtext }]}>Update Home Location</Text>
        <View style={[styles.searchBox, { backgroundColor: theme.input }]}>
          <Ionicons name="search" size={20} color={theme.subtext} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.input, { color: theme.inputText }]}
            placeholder="Search city or area..."
            placeholderTextColor={theme.subtext}
            value={searchQuery}
            onChangeText={searchPlace}
          />
          {loading && <ActivityIndicator size="small" color={Colors.PRIMARY} />}
        </View>

        {results.length > 0 && (
          <View style={[styles.resultsContainer, { backgroundColor: theme.card }]}>
            {results.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.resultItem, { borderBottomColor: theme.bg }]}
                onPress={() => selectLocation(item)}
              >
                <Ionicons name="pin-outline" size={18} color={Colors.PRIMARY} style={{ marginRight: 10 }} />
                <Text style={[styles.resultText, { color: theme.text }]} numberOfLines={2}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {userData?.userLocation && (
          <TouchableOpacity 
            style={styles.confirmBtn}
            onPress={() => {
              Alert.alert("Location Confirmed", "Your home location is now set!");
              router.back();
            }}
          >
            <Text style={styles.confirmText}>Confirm Location</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  weatherCard: {
    padding: 24,
    borderRadius: 25,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationName: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    marginLeft: 10,
    flex: 1,
  },
  weatherInfo: {
    alignItems: 'center',
  },
  temp: {
    fontSize: 60,
    fontFamily: 'Outfit-Bold',
  },
  weatherDesc: {
    fontSize: 18,
    fontFamily: 'Outfit-Regular',
    marginTop: 8,
  },
  noWeather: {
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    marginVertical: 15,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    marginBottom: 12,
    marginLeft: 5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    borderRadius: 18,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
  },
  resultsContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
  },
  resultText: {
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    flex: 1,
  },
  confirmBtn: {
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  confirmText: {
    color: Colors.WHITE,
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
});
