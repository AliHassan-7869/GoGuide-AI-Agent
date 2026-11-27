import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Animated, Image, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "./constants/constants";

import { TouchableOpacity } from "./ui/Touchable";
import { Palette, Typography, Spacing, Radius } from "./constants/theme";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { CreateTripContext } from "../context/CreateTripContext";
import { continueAsGuest } from "./utils/AccountLinkingService";
export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { setEntitlements } = useContext(CreateTripContext) || {};
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestContinue = async () => {
    if (guestLoading) return;
    setGuestLoading(true);
    try {
      const { entitlements } = await continueAsGuest();
      if (entitlements) setEntitlements?.(entitlements);
      router.replace("/(tabs)/discover");
    } catch (err) {
      const msg = err?.message || "Could not start a guest session right now. Please try again.";
      if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
        window.alert(msg);
      } else {
        Alert.alert("Guest Sign-In", msg);
      }
    } finally {
      setGuestLoading(false);
    }
  };

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
          disabled={guestLoading}
          onPress={() => router.push("/auth/sign-in")}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Continue as Guest (2 Free Trips) */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Continue as Guest (2 Free Trips)"
          style={styles.guestButton}
          activeOpacity={0.8}
          disabled={guestLoading}
          onPress={handleGuestContinue}
        >
          {guestLoading ? (
            <ActivityIndicator size="small" color={Palette.white} />
          ) : (
            <Text style={styles.guestButtonText}>Continue as Guest (2 Free Trips)</Text>
          )}
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
    marginBottom: Spacing.md,

    // Soft white glow
    shadowColor: Colors.WHITE || Palette.white,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 8,
  },
  guestButton: {
    width: "100%",
    minHeight: 50,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.45)",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  guestButtonText: {
    color: Palette.white,
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontSemiBold,
    letterSpacing: 0.3,
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
