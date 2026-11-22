import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "./constants/constants";

import { TouchableOpacity } from "./ui/Touchable";
import { Palette } from "./constants/theme";
import { useReduceMotion } from "../hooks/useReduceMotion";
export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  // Animation values for a premium entrance effect
  const fadeAnim = useMemo(() => new Animated.Value(reduceMotion ? 1 : 0), [reduceMotion]);
  const slideAnim = useMemo(() => new Animated.Value(reduceMotion ? 0 : 50), [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs on mount only / depends on stable references
  }, [reduceMotion]);

  return (
    <View style={styles.mainContainer}>
      {/* Hide the default Expo Router Header */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* Immersive Full-Screen Background Image */}
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1495954484750-af469f2f9be5?q=80&w=1400&auto=format&fit=crop" }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* Smooth Gradient Overlay for text readability */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.9)", Palette.black]}
        locations={[0, 0.4, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated Bottom Content Area */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            paddingBottom: Math.max(insets.bottom, 20) + 28,
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
          accessibilityRole="button"
          accessibilityLabel="Get Started"
          style={styles.buttonContainer}
          activeOpacity={0.8}
          onPress={() => router.push("/auth/sign-in")}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.BLACK || Palette.black,
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
    color: Colors.WHITE || Palette.white,
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
    backgroundColor: Colors.WHITE || Palette.white, // White button gives a high-end luxury feel
    paddingVertical: 18,
    borderRadius: 60,
    alignItems: "center",
    marginBottom: 25,

    // Soft white glow
    shadowColor: Colors.WHITE || Palette.white,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 8,
  },
  buttonText: {
    color: Colors.PRIMARY || Palette.brand, // App theme color for text
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
