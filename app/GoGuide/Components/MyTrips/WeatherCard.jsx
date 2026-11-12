import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/constants';
import { useTheme } from '../constants/theme';

export default function WeatherCard({ weatherBrief: weatherBriefProp, destination = "" }) {
  const theme = useTheme();
  const [liveWeather, setLiveWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveWeather() {
      if (!destination) return;
      const cleanCity = destination.split(",")[0].trim();
      if (!cleanCity) return;
      try {
        setLoading(true);
        // Step 1: Geocode city name to lat/lng via open-meteo geocoding (100% free, no key)
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`
        );
        const geoData = await geoRes.json();
        if (geoData?.results?.[0]) {
          const { latitude, longitude } = geoData.results[0];
          // Step 2: Fetch current weather + daily max/min
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
          );
          const weatherJson = await weatherRes.json();
          if (isMounted && weatherJson?.current) {
            setLiveWeather({
              temp: Math.round(weatherJson.current.temperature_2m),
              tempMax: weatherJson.daily?.temperature_2m_max?.[0] != null ? Math.round(weatherJson.daily.temperature_2m_max[0]) : null,
              tempMin: weatherJson.daily?.temperature_2m_min?.[0] != null ? Math.round(weatherJson.daily.temperature_2m_min[0]) : null,
              code: weatherJson.current.weather_code,
              wind: Math.round(weatherJson.current.wind_speed_10m),
            });
          }
        }
      } catch (_err) {
        // Fail silently and use fallback brief
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLiveWeather();
    return () => { isMounted = false; };
  }, [destination]);

  // Decode WMO weather code
  const getWeatherDetails = (code) => {
    if (code == null) return { condition: "Pleasant", icon: "partly-sunny", advice: "Comfortable layers recommended." };
    if (code === 0) return { condition: "Clear Sky", icon: "sunny", advice: "Sunglasses & sunscreen recommended!" };
    if (code >= 1 && code <= 3) return { condition: "Partly Cloudy", icon: "partly-sunny", advice: "Great walking weather. Light jacket for evening." };
    if (code >= 45 && code <= 48) return { condition: "Foggy", icon: "cloudy", advice: "Low visibility; keep a windbreaker." };
    if (code >= 51 && code <= 67) return { condition: "Rain / Drizzle", icon: "rainy", advice: "Carry a compact umbrella & water-resistant shoes." };
    if (code >= 71 && code <= 77) return { condition: "Snow", icon: "snow", advice: "Thermal wear, gloves & heavy winter coat." };
    if (code >= 80 && code <= 82) return { condition: "Rain Showers", icon: "rainy", advice: "Pack rain jacket and waterproof phone pouch." };
    if (code >= 95) return { condition: "Thunderstorm", icon: "thunderstorm", advice: "Stay indoors during heavy downpours." };
    return { condition: "Mild", icon: "partly-sunny", advice: "Comfortable walking shoes & casual attire." };
  };

  const weatherInfo = liveWeather ? getWeatherDetails(liveWeather.code) : null;
  const weatherBrief = weatherBriefProp || "Pleasant travel conditions with comfortable temperatures.";

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: Colors.PRIMARY + '18' }]}>
        <Ionicons name={weatherInfo ? weatherInfo.icon : "partly-sunny"} size={26} color={Colors.PRIMARY} />
      </View>
      
      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.label, { color: theme.subtext }]}>Live Destination Weather</Text>
          {loading && <ActivityIndicator size="small" color={Colors.PRIMARY} style={{ marginLeft: 6 }} />}
        </View>

        {liveWeather ? (
          <>
            <View style={styles.tempRow}>
              <Text style={[styles.tempValue, { color: theme.text }]}>{liveWeather.temp}°C</Text>
              <Text style={[styles.conditionText, { color: Colors.PRIMARY }]}>• {weatherInfo.condition}</Text>
              {liveWeather.tempMax != null && liveWeather.tempMin != null && (
                <Text style={[styles.rangeText, { color: theme.subtext }]}>
                  ({liveWeather.tempMin}° / {liveWeather.tempMax}°)
                </Text>
              )}
            </View>
            <Text style={[styles.adviceText, { color: theme.subtext }]}>
              💡 Wardrobe: {weatherInfo.advice}
            </Text>
          </>
        ) : (
          <Text style={[styles.value, { color: theme.text }]}>{weatherBrief}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  tempValue: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    marginRight: 6,
  },
  conditionText: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    marginRight: 6,
  },
  rangeText: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
  },
  adviceText: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 2,
  },
  value: {
    fontSize: 13,
    fontFamily: 'Outfit-Medium',
    lineHeight: 18,
  },
});
