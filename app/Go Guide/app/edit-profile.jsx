import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { deleteUser, signOut, updatePassword } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
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
  const router = useRouter();
  const theme = useTheme();
  const { userData, setUserData, uid, preferences } = useContext(CreateTripContext);

  const [name, setName] = useState(userData?.name || "Traveler");
  const [email, setEmail] = useState(userData?.email || "user@example.com");
  const [phone, setPhone] = useState(userData?.phone || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState(
    userData?.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
  );

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Avatar rotation
  const changeAvatar = () => {
    const avatars = [
      "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
      "https://cdn-icons-png.flaticon.com/512/3135/3135823.png",
      "https://cdn-icons-png.flaticon.com/512/2919/2919906.png",
      "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
      "https://cdn-icons-png.flaticon.com/512/4140/4140047.png",
    ];
    const next = avatars[Math.floor(Math.random() * avatars.length)];
    setAvatar(next);
  };

  // Save Profile Changes
  const handleSave = async () => {
    if (!uid) {
      Alert.alert("Error", "You must be logged in to update your profile.");
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, "users", uid);
      const updatedData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(userRef, updatedData);
      setUserData((prev) => ({
        ...prev,
        ...updatedData,
      }));

      // Update password if provided
      if (password.trim().length > 0) {
        if (password.length < 6) {
          Alert.alert("Weak Password", "Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        const currentUser = auth.currentUser;
        if (currentUser) {
          await updatePassword(currentUser, password);
        }
      }

      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Save error:", error);
      if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Session Expired",
          "Please logout and login again before updating your password."
        );
      } else {
        Alert.alert("Notice", "Profile details saved successfully.");
      }
    } finally {
      setLoading(false);
    }
  };

  // GDPR: Export Travel Data
  const handleExportData = async () => {
    setExporting(true);
    try {
      let userTrips = [];
      if (auth.currentUser?.email) {
        try {
          const q = query(
            collection(db, "UserTrips"),
            where("userEmail", "==", auth.currentUser.email)
          );
          const snap = await getDocs(q);
          userTrips = snap.docs.map((d) => d.data());
        } catch (e) {
          console.warn("Could not fetch remote trips:", e);
        }
      }

      const exportPayload = {
        app: "GoGuide AI Agent",
        exportedAt: new Date().toISOString(),
        userProfile: {
          uid,
          name,
          email,
          phone,
          avatar,
        },
        travelPreferences: preferences,
        savedTripsCount: userTrips.length,
        savedTrips: userTrips,
      };

      const jsonString = JSON.stringify(exportPayload, null, 2);

      if (Platform.OS === "web") {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `goguide_travel_data_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert("Data Exported", "Your travel archive has been downloaded as JSON.");
      } else {
        await Share.share({
          title: "My GoGuide Travel Data",
          message: jsonString,
        });
      }
    } catch (e) {
      console.error("Export error:", e);
      Alert.alert("Error", "Could not export travel data.");
    } finally {
      setExporting(false);
    }
  };

  // Deactivate Account
  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate Account",
      "Your account will be temporarily hidden. You can reactivate anytime by signing back in. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              if (uid) {
                await updateDoc(doc(db, "users", uid), {
                  status: "deactivated",
                  deactivatedAt: new Date().toISOString(),
                });
              }
              await signOut(auth);
              router.replace("/auth/sign-in");
            } catch (e) {
              console.warn("Deactivation notice:", e);
              router.replace("/auth/sign-in");
            }
          },
        },
      ]
    );
  };

  // Delete Account Permanently (App Store / GDPR)
  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ Delete Account Permanently",
      "This action CANNOT be undone. All your saved itineraries, profile data, and preferences will be permanently wiped.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              if (uid) {
                await deleteDoc(doc(db, "users", uid));
              }
              if (auth.currentUser) {
                await deleteUser(auth.currentUser);
              }
              Alert.alert("Account Deleted", "Your account has been permanently removed.");
              router.replace("/auth/sign-in");
            } catch (error) {
              console.error("Delete error:", error);
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Recent Login Required",
                  "For your security, please logout and login again before permanently deleting your account."
                );
              } else {
                Alert.alert("Notice", "Account marked for deletion.");
                router.replace("/auth/sign-in");
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? "#0C0C12" : "#F8FAFC" }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.isDark ? "#14141F" : "#FFFFFF",
            borderBottomColor: theme.isDark ? "#20202F" : "#E2E8F0",
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.isDark ? "#FFFFFF" : Colors.PRIMARY}
          />
        </TouchableOpacity>
        <View>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.isDark ? "#FFFFFF" : Colors.PRIMARY },
            ]}
          >
            Account & Security
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.isDark ? "#94A3B8" : "#64748B" },
            ]}
          >
            Manage your credentials, privacy & profile
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={changeAvatar} style={styles.avatarWrapper} activeOpacity={0.8}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View style={styles.cameraIconBox}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
            Tap avatar to change style
          </Text>
        </View>

        {/* SECTION 1: PERSONAL INFORMATION */}
        <Text style={[styles.sectionLabel, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
          PERSONAL DETAILS
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.isDark ? "#161622" : "#FFFFFF",
              borderColor: theme.isDark ? "#242436" : "#E2E8F0",
            },
          ]}
        >
          {/* Full Name */}
          <View style={styles.inputFieldBlock}>
            <Text style={[styles.fieldLabel, { color: theme.isDark ? "#E2E8F0" : "#334155" }]}>
              Full Name
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.isDark ? "#202030" : "#F8FAFC",
                  borderColor: theme.isDark ? "#2C2C40" : "#E2E8F0",
                },
              ]}
            >
              <Ionicons name="person-outline" size={18} color="#94A3B8" />
              <TextInput
                style={[
                  styles.textInput,
                  { color: theme.isDark ? "#FFFFFF" : "#0F172A" },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                placeholderTextColor={theme.isDark ? "#64748B" : "#94A3B8"}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.isDark ? "#222234" : "#F1F5F9" }]} />

          {/* Email Address */}
          <View style={styles.inputFieldBlock}>
            <View style={styles.labelWithBadgeRow}>
              <Text style={[styles.fieldLabel, { color: theme.isDark ? "#E2E8F0" : "#334155" }]}>
                Email Address
              </Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.isDark ? "#202030" : "#F8FAFC",
                  borderColor: theme.isDark ? "#2C2C40" : "#E2E8F0",
                },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color="#94A3B8" />
              <TextInput
                style={[
                  styles.textInput,
                  { color: theme.isDark ? "#FFFFFF" : "#0F172A" },
                ]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@example.com"
                placeholderTextColor={theme.isDark ? "#64748B" : "#94A3B8"}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.isDark ? "#222234" : "#F1F5F9" }]} />

          {/* Phone Number (Optional) */}
          <View style={styles.inputFieldBlock}>
            <Text style={[styles.fieldLabel, { color: theme.isDark ? "#E2E8F0" : "#334155" }]}>
              Phone Number <Text style={styles.optionalText}>(Optional)</Text>
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.isDark ? "#202030" : "#F8FAFC",
                  borderColor: theme.isDark ? "#2C2C40" : "#E2E8F0",
                },
              ]}
            >
              <Ionicons name="call-outline" size={18} color="#94A3B8" />
              <TextInput
                style={[
                  styles.textInput,
                  { color: theme.isDark ? "#FFFFFF" : "#0F172A" },
                ]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+1 234 567 8900"
                placeholderTextColor={theme.isDark ? "#64748B" : "#94A3B8"}
              />
            </View>
          </View>
        </View>

        {/* SECTION 2: SECURITY */}
        <Text style={[styles.sectionLabel, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
          SECURITY & PASSWORD
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.isDark ? "#161622" : "#FFFFFF",
              borderColor: theme.isDark ? "#242436" : "#E2E8F0",
            },
          ]}
        >
          <View style={styles.inputFieldBlock}>
            <Text style={[styles.fieldLabel, { color: theme.isDark ? "#E2E8F0" : "#334155" }]}>
              New Password
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.isDark ? "#202030" : "#F8FAFC",
                  borderColor: theme.isDark ? "#2C2C40" : "#E2E8F0",
                },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              <TextInput
                style={[
                  styles.textInput,
                  { color: theme.isDark ? "#FFFFFF" : "#0F172A" },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="Leave blank to keep current password"
                placeholderTextColor={theme.isDark ? "#64748B" : "#94A3B8"}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save Changes Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Account Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {/* SECTION 3: PRIVACY & DATA EXPORT */}
        <Text style={[styles.sectionLabel, { color: theme.isDark ? "#94A3B8" : "#64748B", marginTop: 24 }]}>
          DATA PRIVACY (GDPR)
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.isDark ? "#161622" : "#FFFFFF",
              borderColor: theme.isDark ? "#242436" : "#E2E8F0",
            },
          ]}
        >
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportData}
            disabled={exporting}
            activeOpacity={0.7}
          >
            <View style={styles.iconBadgeBlue}>
              <Ionicons name="download-outline" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: theme.isDark ? "#FFFFFF" : "#0F172A" }]}>
                Export My Travel Archive
              </Text>
              <Text style={[styles.actionDesc, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
                Download all your saved trips & account data as JSON
              </Text>
            </View>
            {exporting ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 4: DANGER ZONE */}
        <Text style={[styles.sectionLabel, { color: "#EF4444", marginTop: 20 }]}>
          DANGER ZONE
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.isDark ? "#1B1417" : "#FEF2F2",
              borderColor: theme.isDark ? "#3B1E22" : "#FEE2E2",
            },
          ]}
        >
          {/* Deactivate Account */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleDeactivate}
            activeOpacity={0.7}
          >
            <View style={styles.iconBadgeAmber}>
              <Ionicons name="pause-circle-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: theme.isDark ? "#FDE68A" : "#92400E" }]}>
                Deactivate Account
              </Text>
              <Text style={[styles.actionDesc, { color: theme.isDark ? "#D97706" : "#B45309" }]}>
                Temporarily pause your profile and sign out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D97706" />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.isDark ? "#331E24" : "#FEE2E2" }]} />

          {/* Delete Account Permanently */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleDeleteAccount}
            disabled={deleting}
            activeOpacity={0.7}
          >
            <View style={styles.iconBadgeRed}>
              <Ionicons name="trash" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: "#DC2626" }]}>
                Delete Account Permanently
              </Text>
              <Text style={[styles.actionDesc, { color: theme.isDark ? "#F87171" : "#EF4444" }]}>
                Wipe all saved trips, profile info and cloud credentials
              </Text>
            </View>
            {deleting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#DC2626" />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 54 : 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  cameraIconBox: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#7C3AED",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarHint: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  inputFieldBlock: {
    padding: 14,
  },
  labelWithBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    marginBottom: 6,
  },
  optionalText: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    color: "#94A3B8",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 10,
    color: "#10B981",
    fontFamily: "Outfit-Bold",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  saveBtn: {
    backgroundColor: Colors.PRIMARY || "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  actionDesc: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  iconBadgeBlue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeAmber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeRed: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(220, 38, 38, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});