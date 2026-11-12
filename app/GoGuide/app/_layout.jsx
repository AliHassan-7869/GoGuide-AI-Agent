import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { View, Platform, StyleSheet, useWindowDimensions, LogBox } from "react-native";
LogBox.ignoreAllLogs(true);
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme } from "../Components/constants/theme";
import { CreateTripProvider } from "../context/CreateTripContext";
import ErrorBoundary from "../Components/ErrorBoundary";
import { installAndroidTextDefaults } from "../Components/utils/androidTextDefaults";
import { GestureHandlerRootView } from "react-native-gesture-handler";

installAndroidTextDefaults();

function AppContent() {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const isDark = theme.isDark;

  const isDesktopWeb = Platform.OS === "web" && width > 520;

  const stack = (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
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
        <Stack.Screen name="trip" options={{ headerShown: false }} />
      </Stack>
    </>
  );

  if (isDesktopWeb) {
    return (
      <View style={[styles.webOuter, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.webContainer,
            { backgroundColor: theme.bg },
          ]}
        >
          {stack}
        </View>
      </View>
    );
  }

  // On Mobile Web, wrap in a fixed viewport-height flex container so inner ScrollViews scroll while bottom tabs stay pinned
  if (Platform.OS === "web") {
    return (
      <View
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          maxHeight: "100dvh",
          overflow: "hidden",
          backgroundColor: theme.bg,
        }}
      >
        {stack}
      </View>
    );
  }

  return stack;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Outfit-Regular": require("../assets/fonts/Outfit-Regular.ttf"),
    "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
    "Outfit-Medium": require("../assets/fonts/Outfit-Medium.ttf"),
  });

  // On Web, Google Fonts Outfit is injected via +html.jsx; never block web with an empty screen
  if (!fontsLoaded && !fontError && Platform.OS !== "web") return <View />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider style={{ flex: 1 }}>
      <ErrorBoundary>
        <CreateTripProvider>
          <AppContent />
        </CreateTripProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    width: "100%",
    height: "100%",
    maxHeight: "100dvh",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  webContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 460,
    height: "100%",
    maxHeight: "100dvh",
    overflow: "hidden",
  },
});

