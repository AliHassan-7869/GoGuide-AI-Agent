import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function Profile() {
  const router = useRouter();
  const { userData } = useContext(CreateTripContext);
  const theme = useTheme();

  const menuOptions = [
    { id: "1", title: "Account & Security", icon: "shield-checkmark-outline", route: "/edit-profile" },
    { id: "2", title: "Personal Location", icon: "location-outline", route: "/location" },
    { id: "3", title: "My Bookings", icon: "briefcase-outline", route: "/mytrip" },
    { id: "4", title: "Preferences", icon: "settings-outline", route: "/preferences" },
    { id: "5", title: "Help Center", icon: "help-circle-outline", route: "/help-center" },
    { id: "6", title: "Sign Out", icon: "log-out-outline", route: "/auth/sign-in" },
  ];

  const handleMenuPress = (route) => {
    if (route) {
      if (route === "/mytrip") {
        router.push("/(tabs)/mytrip");
      } else {
        router.push(route);
      }
    } else {
      alert("Feature coming soon!");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={[styles.headerTitle, { color: theme.isDark ? theme.text : Colors.PRIMARY }]}>
          Profile
        </Text>
      </View>

      {/* User Info Section */}
      <View style={styles.userInfoSection}>
        <Image
          source={{ uri: userData?.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
          style={styles.avatar}
        />
        <Text style={[styles.userName, { color: theme.text }]}>{userData?.name || "Traveler"}</Text>
        <Text style={[styles.userEmail, { color: theme.subtext }]}>{userData?.email || "user@example.com"}</Text>
      </View>

      {/* Menu List Section */}
      <View style={styles.menuContainer}>
        <FlatList
          data={menuOptions}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.card }]}
              onPress={() => handleMenuPress(item.route)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={24} color={theme.isDark ? theme.icon : Colors.PRIMARY} />
                <Text style={[styles.menuItemTitle, { color: theme.text }]}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Outfit-Bold",
  },
  userInfoSection: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: Colors.PRIMARY,
  },
  userName: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    marginTop: 5,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 25,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Medium",
    marginLeft: 15,
  },
});
