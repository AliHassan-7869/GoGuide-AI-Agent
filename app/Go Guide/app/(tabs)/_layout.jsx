import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useContext } from "react";
import { Platform } from "react-native";
import { Colors } from "../../Components/constants/constants";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function TabLayout() {
  const { preferences } = useContext(CreateTripContext);
  const isDark = preferences?.darkMode;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: isDark ? "#888888" : "#999999",
        tabBarStyle: {
          backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
          borderTopColor: isDark ? "#2C2C2C" : "#E0E0E0",
          height: Platform.OS === "ios" ? 86 : 64,
          paddingBottom: Platform.OS === "ios" ? 26 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Outfit-Medium",
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="mytrip"
        options={{
          tabBarLabel: "My Trip",
          tabBarIcon: ({ color }) => (
            <Ionicons name="location-sharp" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          tabBarLabel: "Discover",
          tabBarIcon: ({ color }) => (
            <Ionicons name="globe-sharp" size={24} color={color} />
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
              size={24}
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
            <Ionicons name="people-circle" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
