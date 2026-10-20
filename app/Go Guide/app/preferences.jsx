import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../Components/constants/constants";
import { useTheme } from "../Components/constants/theme";
import { CreateTripContext } from "../context/CreateTripContext";

export default function Preferences() {
    const router = useRouter();
    const { preferences, setPreferences } = useContext(CreateTripContext);
    const theme = useTheme();

    const togglePreference = (key) => {
        setPreferences((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    return (
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.isDark ? theme.text : Colors.PRIMARY} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.isDark ? theme.text : Colors.PRIMARY }]}>Preferences</Text>
            </View>

            <View style={styles.listContainer}>
                {/* Push Notifications */}
                <View style={[styles.preferenceItem, { borderBottomColor: theme.border }]}>
                    <View style={styles.itemLeft}>
                        <Ionicons name="notifications-outline" size={24} color={theme.isDark ? theme.text : Colors.PRIMARY} />
                        <Text style={[styles.itemText, { color: theme.text }]}>Push Notifications</Text>
                    </View>
                    <Switch
                        value={preferences?.notifications}
                        onValueChange={() => togglePreference("notifications")}
                        trackColor={{ false: "#D3D3D3", true: Colors.PRIMARY }}
                        thumbColor={Colors.WHITE}
                    />
                </View>

                {/* Dark Mode */}
                <View style={[styles.preferenceItem, { borderBottomColor: theme.border }]}>
                    <View style={styles.itemLeft}>
                        <Ionicons name="moon-outline" size={24} color={theme.isDark ? theme.text : Colors.PRIMARY} />
                        <Text style={[styles.itemText, { color: theme.text }]}>Dark Mode</Text>
                    </View>
                    <Switch
                        value={preferences?.darkMode}
                        onValueChange={() => togglePreference("darkMode")}
                        trackColor={{ false: "#D3D3D3", true: Colors.PRIMARY }}
                        thumbColor={Colors.WHITE}
                    />
                </View>

                {/* Location Services */}
                <View style={[styles.preferenceItem, { borderBottomColor: theme.border }]}>
                    <View style={styles.itemLeft}>
                        <Ionicons name="location-outline" size={24} color={theme.isDark ? theme.text : Colors.PRIMARY} />
                        <Text style={[styles.itemText, { color: theme.text }]}>Location Services</Text>
                    </View>
                    <Switch
                        value={preferences?.locationServices}
                        onValueChange={() => togglePreference("locationServices")}
                        trackColor={{ false: "#D3D3D3", true: Colors.PRIMARY }}
                        thumbColor={Colors.WHITE}
                    />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: "Outfit-Bold",
    },
    listContainer: {
        paddingHorizontal: 20,
    },
    preferenceItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    itemLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    itemText: {
        fontSize: 18,
        fontFamily: "Outfit-Medium",
        marginLeft: 15,
    },
});
