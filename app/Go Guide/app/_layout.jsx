import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useContext } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CreateTripContext, CreateTripProvider } from "../context/CreateTripContext";
import ErrorBoundary from "../Components/ErrorBoundary";

function AppContent() {
  const context = useContext(CreateTripContext);
  const isDark = context?.preferences?.darkMode;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
      <Stack>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-trip/search-place" options={{ headerShown: false }} />
        <Stack.Screen
          name="create-trip/select-traveler"
          options={{
            headerShown: true,
            title: "Select Traveler",
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen name="create-trip/interest-page" options={{ headerShown: true, title: "Interests" }} />
        <Stack.Screen
          name="create-trip/select-dates"
          options={{
            headerShown: true,
            title: "Select Dates",
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen name="create-trip/select-budget" options={{ headerShown: true, title: "Budget" }} />
        <Stack.Screen name="create-trip/review-trip" options={{ headerShown: true, title: "Review Trip" }} />
        <Stack.Screen name="create-trip/generate-trip" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-in/index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-up/index" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="preferences" options={{ headerShown: false }} />
        <Stack.Screen name="help-center" options={{ headerShown: false }} />
        <Stack.Screen name="my-bookings" options={{ headerShown: false }} />
        <Stack.Screen name="packing-checklist" options={{ headerShown: false }} />
        <Stack.Screen name="cities" options={{ headerShown: false }} />
        <Stack.Screen name="beaches" options={{ headerShown: false }} />
        <Stack.Screen name="mountains" options={{ headerShown: false }} />
        <Stack.Screen name="forest" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
        <Stack.Screen name="location" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Outfit-Regular": require("../assets/fonts/Outfit-Regular.ttf"),
    "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
    "Outfit-Medium": require("../assets/fonts/Outfit-Medium.ttf"),
  });

  if (!fontsLoaded) return <View />;

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <ErrorBoundary>
        <CreateTripProvider>
          <AppContent />
        </CreateTripProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

