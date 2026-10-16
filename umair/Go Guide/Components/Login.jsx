import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../Components/constants/constants";

export default function Login() {
  const router = useRouter();
  const { height, width } = Dimensions.get("window");

  // Animation values for a premium entrance effect
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.mainContainer}>
      {/* Hide the default Expo Router Header */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* Immersive Full-Screen Background Image */}
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1495954484750-af469f2f9be5?q=80&w=800&auto=format&fit=crop" }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* Smooth Gradient Overlay for text readability */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.85)", "#000000"]}
        locations={[0, 0.4, 0.8, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated Bottom Content Area */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Logo/Title */}
        <Text style={styles.title}>GoGuide</Text>

        {/* Tagline */}
        <Text style={styles.subtitle}>
          Discover your next adventure effortlessly.{"\n"}
          Personalized itineraries at your fingertips.
        </Text>

        {/* Premium Get Started Button */}
        <TouchableOpacity
          style={styles.buttonContainer}
          activeOpacity={0.8}
          onPress={() => router.push("/auth/sign-in")}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Subtle footer */}
        <Text style={styles.footerText}>

        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.BLACK || "#000",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === "ios" ? 60 : 45, // Dynamic bottom padding
    alignItems: "center",
  },
  title: {
    fontSize: 48, // Even larger and more striking
    fontFamily: "Outfit-Bold",
    color: Colors.WHITE || "#FFF",
    marginBottom: 10,
    letterSpacing: 2, // Wider, elegant tracking
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Outfit-Regular",
    color: "rgba(255, 255, 255, 0.85)", // Whiter, crisper subtitle
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 45,
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: "100%",
    backgroundColor: Colors.WHITE || "#FFF", // White button gives a high-end luxury feel
    paddingVertical: 18,
    borderRadius: 60,
    alignItems: "center",
    marginBottom: 25,

    // Soft white glow
    shadowColor: Colors.WHITE || "#FFF",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 8,
  },
  buttonText: {
    color: Colors.PRIMARY || "#0a7ea4", // App theme color for text
    fontSize: 18,
    fontFamily: "Outfit-Bold",
    letterSpacing: 1,
    textTransform: "uppercase", // Uppercase pushes modern aesthetic
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    color: "rgba(255, 255, 255, 0.4)", // Very subtle opacity
    textAlign: "center",
  },
});
