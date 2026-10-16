import { Ionicons } from "@expo/vector-icons";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useContext, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Colors } from "../Components/constants/constants";
import { useTheme } from "../Components/constants/theme";
import { auth, db } from "../Configs/FirebaseConfig";
import { CreateTripContext } from "../context/CreateTripContext";

export default function EditProfile() {
    const { userData, setUserData, uid } = useContext(CreateTripContext);
    const theme = useTheme();

    const [name, setName] = useState(userData?.name || "Traveler");
    const [email, setEmail] = useState(userData?.email || "user@example.com");
    const [password, setPassword] = useState("");
    const [avatar, setAvatar] = useState(
        userData?.avatar ||
        "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    );
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!uid) {
            Alert.alert("Error", "You must be logged in to update your profile.");
            return;
        }

        setLoading(true);

        try {
            const userRef = doc(db, "users", uid);

            const updatedData = {
                name,
                email,
                avatar,
            };

            await updateDoc(userRef, updatedData);

            setUserData((prev) => ({
                ...prev,
                ...updatedData,
            }));

            if (password.trim().length > 0) {
                if (password.length < 6) {
                    Alert.alert("Weak Password", "Password must be at least 6 characters.");
                    setLoading(false);
                    return;
                }

                const currentUser = auth.currentUser;
                await updatePassword(currentUser, password);
            }

            Alert.alert("Success", "Profile updated successfully!");
        } catch (error) {
            console.log(error);

            if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                    "Session Expired",
                    "Please logout and login again before changing password."
                );
            } else {
                Alert.alert("Error", "Failed to update profile.");
            }
        } finally {
            setLoading(false);
        }
    };

    const changeAvatar = () => {
        const avatars = [
            "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            "https://cdn-icons-png.flaticon.com/512/3135/3135823.png",
            "https://cdn-icons-png.flaticon.com/512/2919/2919906.png",
            "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
        ];

        const next = avatars[Math.floor(Math.random() * avatars.length)];
        setAvatar(next);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <View style={[styles.header, { backgroundColor: theme.bg }]}>
                <Text style={[styles.headerTitle, { color: theme.isDark ? theme.text : Colors.PRIMARY }]}>Edit Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={changeAvatar} style={styles.avatarWrapper}>
                        <Image source={{ uri: avatar }} style={styles.avatar} />

                        <View style={styles.editIconWrapper}>
                            <Ionicons name="camera" size={18} color={Colors.WHITE} />
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.avatarHint}>Tap to change photo</Text>
                </View>

                <Text style={[styles.label, { color: theme.subtext }]}>Full Name</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.inputText }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.subtext}
                />

                <Text style={[styles.label, { color: theme.subtext }]}>Email Address</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.inputText }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    placeholderTextColor={theme.subtext}
                />

                <Text style={[styles.label, { color: theme.subtext }]}>New Password</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.input, color: theme.inputText }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter new password"
                    secureTextEntry
                    placeholderTextColor={theme.subtext}
                />

                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.WHITE} />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },

    header: {
        alignItems: "center",
        marginBottom: 20,
    },

    headerTitle: {
        fontSize: 24,
        fontFamily: "Outfit-Bold",
        color: Colors.PRIMARY,
    },

    formContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    avatarSection: {
        alignItems: "center",
        marginBottom: 30,
    },

    avatarWrapper: {
        position: "relative",
    },

    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: Colors.PRIMARY,
    },

    editIconWrapper: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: Colors.PRIMARY,
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Colors.WHITE,
    },

    avatarHint: {
        marginTop: 10,
        fontSize: 14,
        color: Colors.GRAY,
        fontFamily: "Outfit-Regular",
    },

    label: {
        fontSize: 16,
        fontFamily: "Outfit-Medium",
        color: Colors.GRAY,
        marginBottom: 8,
    },

    input: {
        backgroundColor: "#F2F2F2",
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 55,
        fontSize: 16,
        fontFamily: "Outfit-Regular",
        marginBottom: 20,
    },

    saveBtn: {
        backgroundColor: Colors.PRIMARY,
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: "center",
        marginTop: 20,
    },

    saveBtnText: {
        color: Colors.WHITE,
        fontSize: 18,
        fontFamily: "Outfit-Bold",
    },
});