import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Colors } from "../constants/constants";
import { useTheme } from "../constants/theme";

export default function StartNewTripCard() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: Colors.PRIMARY + '20' }]}>
        <Ionicons name="airplane-outline" size={50} color={Colors.PRIMARY} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        No Adventures Yet
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.subtext }]}>
        Your dream getaway is just a few clicks away. Let our AI plan the perfect trip for you!
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/create-trip/search-place")}
        style={[styles.button, { backgroundColor: Colors.PRIMARY }]}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Plan My First Trip</Text>
        <Ionicons name="rocket-outline" size={20} color="#FFF" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 30,
    marginTop: 80,
    alignItems: "center",
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  title: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 35,
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 35,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
});
