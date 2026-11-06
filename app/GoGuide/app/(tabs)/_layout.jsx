import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { useContext, useEffect, useRef } from "react";
import { BackHandler, Platform, ToastAndroid } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../Components/constants/constants";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function TabLayout() {
  const { preferences } = useContext(CreateTripContext);
  const insets = useSafeAreaInsets();
  const isDark = preferences?.darkMode;
  const router = useRouter();
  const lastBack = useRef(0);

  // Android: back on a root tab needs a second press within 2s to exit (modals handle their own back first)
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (router.canGoBack()) return false; // let navigation / modals handle it
      const now = Date.now();
      if (now - lastBack.current < 2000) return false;
      lastBack.current = now;
      ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  const bottomInset = Platform.select({
    ios: Math.max(insets.bottom, 20),
    android: Math.max(insets.bottom, 8),
    default: Math.max(insets.bottom, 8),
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: isDark ? "#888888" : "#999999",
        sceneStyle: {
          flex: 1,
          overflow: "hidden",
        },
        tabBarStyle: {
          backgroundColor: isDark ? "#121212" : "#FFFFFF",
          borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          borderTopWidth: 1,
          height: 58 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
          flexShrink: 0,
          // Completely remove shadows across Android and iOS
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: "transparent",
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontFamily: "Outfit-Medium",
          fontSize: 11,
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="mytrip"
        options={{
          tabBarLabel: "My Trip",
          tabBarIcon: ({ color }) => (
            <Ionicons name="location-sharp" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          tabBarLabel: "Discover",
          tabBarIcon: ({ color }) => (
            <Ionicons name="globe-sharp" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ai-assistant"
        options={{
          tabBarLabel: "AI Copilot",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "sparkles" : "sparkles-outline"}
              size={22}
              color={focused ? "#7C3AED" : color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-circle" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
