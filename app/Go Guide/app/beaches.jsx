import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Platform } from 'react-native';
import React, { useContext } from 'react';
import { Stack, useRouter } from "expo-router";
import { CreateTripContext } from '../context/CreateTripContext';
import { Colors } from '../Components/constants/constants';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Beaches() {
  const router = useRouter();
  const { preferences, setTripData } = useContext(CreateTripContext);
  const isDark = preferences?.darkMode;

  const beaches = [
    {
      id: 1,
      title: "Maldives",
      image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=600&auto=format&fit=crop",
      rating: "5.0",
      liked: true,
      lat: "3.2028",
      lon: "73.2207",
    },
    {
      id: 2,
      title: "Bora Bora",
      image: "https://images.unsplash.com/photo-1533692328991-08159ff19fca?q=80&w=600&auto=format&fit=crop",
      rating: "4.9",
      liked: false,
      lat: "-16.5004",
      lon: "-151.7415",
    },
    {
      id: 3,
      title: "Maui, Hawaii",
      image: "https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=600&auto=format&fit=crop",
      rating: "4.8",
      liked: true,
      lat: "20.7984",
      lon: "-156.3319",
    },
    {
      id: 4,
      title: "Phuket, Thailand",
      image: "https://images.unsplash.com/photo-1589394815804-964ce0fc5d13?q=80&w=600&auto=format&fit=crop",
      rating: "4.7",
      liked: false,
      lat: "7.8804",
      lon: "98.3923",
    }
  ];

  const themeStyles = {
    backgroundColor: isDark ? "#121212" : "#F8F9FA",
    textColor: isDark ? "#FFFFFF" : "#1A1A1A",
    subTextColor: isDark ? "#A0A0A0" : "#666666",
    cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
  };

  const selectDestination = (dest) => {
    setTripData((prev) => ({
      ...prev,
      toLocation: {
        name: dest.title,
        coordinates: { lat: dest.lat, lng: dest.lon },
      },
      toLocationImage: dest.image,
      toLocationRating: dest.rating,
      fromLocation: { name: "Current Location", coordinates: { lat: 0, lng: 0 } },
    }));
    router.push("/create-trip/trip-summer");
  };

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeStyles.textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeStyles.textColor }]}>Beautiful Beaches</Text>
      </View>

      <FlatList
        data={beaches}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: themeStyles.cardBg }]} 
            onPress={() => selectDestination(item)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.infoContainer}>
              <Text style={[styles.cardTitle, { color: themeStyles.textColor }]}>{item.title}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={[styles.ratingText, { color: themeStyles.subTextColor }]}>{item.rating}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontFamily: "Outfit-Bold",
    fontSize: 24,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: "100%",
    height: 200,
  },
  infoContainer: {
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontFamily: "Outfit-Medium",
    fontSize: 14,
    marginLeft: 5,
  },
});
