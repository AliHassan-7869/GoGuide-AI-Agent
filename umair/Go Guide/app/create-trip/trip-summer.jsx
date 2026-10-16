import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Platform, Dimensions } from "react-native";
import React, { useContext } from "react";
import { Stack, useRouter } from "expo-router";
import { CreateTripContext } from "../../context/CreateTripContext";
import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

export default function TripSummer() {
  const router = useRouter();
  const theme = useTheme();
  const { tripData } = useContext(CreateTripContext);
  
  const destination = tripData?.toLocation?.name || "Destination";
  const image = tripData?.toLocationImage || "https://images.unsplash.com/photo-1502602898657-3e907fa0a586?q=80&w=1000&auto=format&fit=crop";
  const rating = tripData?.toLocationRating || "4.9";

  const handleStartPlanning = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/create-trip/select-traveler");
  };

  const highlights = [
    { icon: "star", title: "Top Rated", desc: "Highly popular among global travelers" },
    { icon: "camera", title: "Picturesque", desc: "Breathtaking views and landmarks" },
    { icon: "fast-food", title: "Culinary", desc: "World-class dining and local treats" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Image Section */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.imageOverlay}>
            <Text style={styles.destName}>{destination.split(',')[0]}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.ratingText}>{rating} • Exploration Haven</Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={[styles.contentCard, { backgroundColor: theme.bg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About {destination.split(',')[0]}</Text>
          <Text style={[styles.description, { color: theme.subtext }]}>
            Experience the magic of {destination}. From its iconic landmarks to hidden gems loved by locals, 
            this destination offers a unique blend of culture, history, and modern adventure. 
            Whether you're seeking a romantic getaway, a family vacation, or a solo exploration, 
            {destination.split(',')[0]} has something special for everyone.
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Highlights</Text>
          {highlights.map((item, index) => (
            <View key={index} style={styles.highlightItem}>
              <View style={[styles.iconBox, { backgroundColor: Colors.PRIMARY + '15' }]}>
                <Ionicons name={item.icon} size={22} color={Colors.PRIMARY} />
              </View>
              <View style={styles.highlightText}>
                <Text style={[styles.highlightTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.highlightDesc, { color: theme.subtext }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Button Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
        <TouchableOpacity 
          style={styles.planBtn} 
          activeOpacity={0.9}
          onPress={handleStartPlanning}
        >
          <Text style={styles.planBtnText}>Start Planning My Trip</Text>
          <Ionicons name="rocket-outline" size={20} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: width,
    height: height * 0.5,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 25,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingBottom: 40,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destName: {
    color: '#FFF',
    fontSize: 40,
    fontFamily: 'Outfit-Bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    marginLeft: 8,
  },
  contentCard: {
    marginTop: -25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    lineHeight: 24,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 20,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  highlightText: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
  },
  highlightDesc: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    borderTopWidth: 1,
  },
  planBtn: {
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 18,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  planBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
});
