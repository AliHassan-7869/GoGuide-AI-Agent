import { Ionicons } from "@expo/vector-icons";
import { downloadFile } from "../Components/utils/fileDownloader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { deleteUser, signOut, updatePassword } from "firebase/auth";
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import React, { useContext, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView } from "react-native";
import { Colors } from "../Components/constants/constants";
import { Radius, Spacing, Typography, lightTheme, useTheme } from "../Components/constants/theme";
import FadeInView from "../Components/ui/FadeInView";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { auth, db } from "../Configs/FirebaseConfig";
import { CreateTripContext } from "../context/CreateTripContext";
import { clearLocalUserData, deleteAllUserData, hasRecentLogin } from "../Components/utils/AccountService";

import { TouchableOpacity } from "../Components/ui/Touchable";

const Field = ({ label, optional, badge, icon, right, ...inputProps }) => {
  const theme = useTheme();
  return (
    <View style={styles.inputFieldBlock}>
      <View style={styles.labelWithBadgeRow}>
        <Text style={[styles.fieldLabel, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
          {label}
          {optional ? <Text style={[styles.optionalText, { color: theme.subtext }]}> (Optional)</Text> : null}
        </Text>
        {badge}
      </View>
      <View style={[styles.inputWrap, { backgroundColor: theme.input, borderColor: theme.border }]}>
        <Ionicons name={icon} size={18} color={theme.subtext} />
        <TextInput
          accessibilityLabel={label}
          style={[styles.textInput, { color: theme.inputText }]}
          placeholderTextColor={theme.subtext}
          maxFontSizeMultiplier={1.3}
          {...inputProps}
        />
        {right}
      </View>
    </View>
  );
};

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { userData, setUserData, uid, preferences } = useContext(CreateTripContext);

  const [name, setName] = useState(userData?.name || "Traveler");
  const [email, setEmail] = useState(userData?.email || "");
  const [phone, setPhone] = useState(userData?.phone || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState(
    userData?.avatar || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
  );

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Avatar rotation (random style)
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

  // Pick custom DP from device gallery
  const pickImageFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant gallery access in settings to upload your profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setAvatar(pickedUri);
        // Instant context sync
        if (setUserData) {
          setUserData((prev) => ({ ...prev, avatar: pickedUri }));
        }
      }
    } catch (e) {
      console.error("Gallery picker error:", e);
      Alert.alert("Gallery Error", "Unable to open gallery. Please try again.");
    }
  };

  // Avatar Press Menu
  const handleAvatarPress = () => {
    if (Platform.OS === "web") {
      pickImageFromGallery();
      return;
    }

    Alert.alert(
      "Profile Photo",
      "Choose an option to update your display picture:",
      [
        {
          text: "Choose from Gallery",
          onPress: pickImageFromGallery,
        },
        {
          text: "Random Travel Avatar",
          onPress: changeAvatar,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
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

      // Save to Firestore with merge: true (creates doc if new, updates if exists)
      await setDoc(userRef, updatedData, { merge: true });
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

      // Automatically return back to the Profile screen
      if (Platform.OS === "web") {
        router.replace("/(tabs)/profile");
      } else {
        Alert.alert("Success ✅", "Profile updated successfully!", [
          { text: "OK", onPress: () => router.replace("/(tabs)/profile") },
        ]);
      }
    } catch (error) {
      console.error("Save error:", error);
      if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Session Expired",
          "Please logout and login again before updating your password."
        );
      } else {
        Alert.alert("Couldn't save", "Your changes were not saved. Please check your connection and try again.");
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

      const result = await downloadFile({
        fileName: `goguide_travel_data_${Date.now()}.json`,
        data: jsonString,
        mimeType: "application/json",
        dialogTitle: "Save My GoGuide Travel Data",
      });
      if (!result.ok) throw result.error || new Error("Export failed");
      if (Platform.OS === "web") {
        Alert.alert("Data Exported", "Your travel archive has been downloaded as JSON.");
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
      "This action CANNOT be undone. Your account, saved trips, bookings, favourites and shared trip links will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) {
              router.replace("/auth/sign-in");
              return;
            }
            // Check BEFORE deleting anything: Firebase refuses to delete accounts with an old login,
            // and we must not wipe the data and then fail to remove the login.
            if (!hasRecentLogin(user)) {
              Alert.alert(
                "Please Sign In Again",
                "For your security, sign out and sign in again, then delete your account right away."
              );
              return;
            }
            setDeleting(true);
            try {
              await deleteAllUserData({ uid: user.uid, email: user.email });
              await deleteUser(user);
              await clearLocalUserData();
              Alert.alert("Account Deleted", "Your account and data have been permanently removed.");
              router.replace("/auth/sign-in");
            } catch (error) {
              console.error("Delete error:", error);
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Please Sign In Again",
                  "For your security, sign out and sign in again, then delete your account right away."
                );
              } else {
                Alert.alert(
                  "Could Not Delete Account",
                  "Something went wrong and your account was not fully deleted. Please check your connection and try again."
                );
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const onAccent = lightTheme.card;
  const cardStyle = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];
  const sectionColor = { color: theme.subtext };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScreenHeader
        title="Account & Security"
        subtitle="Manage your credentials, privacy & profile"
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 84 }]}
          showsVerticalScrollIndicator={false}
        >
          <FadeInView index={0} style={styles.avatarSection}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              onPress={handleAvatarPress}
              style={styles.avatarWrapper}
              activeOpacity={0.8}
            >
              <Image source={{ uri: avatar }} style={[styles.avatar, { borderColor: Colors.PRIMARY }]} accessibilityLabel="Your profile photo" />
              <View style={[styles.cameraIconBox, { backgroundColor: Colors.PRIMARY, borderColor: theme.bg }]}>
                <Ionicons name="camera" size={16} color={onAccent} />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarHint, sectionColor]} maxFontSizeMultiplier={1.3}>
              Tap avatar or select an option below
            </Text>

            <View style={styles.avatarActionButtonsRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Choose photo from gallery"
                onPress={pickImageFromGallery}
                style={[styles.avatarActionBtn, { backgroundColor: theme.badgeBg, borderColor: Colors.PRIMARY }]}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={16} color={Colors.PRIMARY} style={{ marginRight: 6 }} />
                <Text style={[styles.avatarActionText, { color: Colors.PRIMARY }]} maxFontSizeMultiplier={1.3}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Use a random travel avatar"
                onPress={changeAvatar}
                style={[styles.avatarActionBtn, { backgroundColor: theme.badgeBg, borderColor: theme.border }]}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles-outline" size={16} color={theme.text} style={{ marginRight: 6 }} />
                <Text style={[styles.avatarActionText, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Random Avatar</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>

          <FadeInView index={1}>
            <Text accessibilityRole="header" style={[styles.sectionLabel, sectionColor]} maxFontSizeMultiplier={1.3}>PERSONAL DETAILS</Text>
            <View style={cardStyle}>
              <Field
                label="Full Name"
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                autoComplete="name"
                returnKeyType="next"
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Field
                label="Email Address"
                icon="mail-outline"
                badge={
                  <View style={[styles.verifiedBadge, { backgroundColor: theme.badgeBg }]}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.SUCCESS} />
                    <Text style={[styles.verifiedText, { color: Colors.SUCCESS }]} maxFontSizeMultiplier={1.3}>Verified</Text>
                  </View>
                }
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="name@example.com"
                returnKeyType="next"
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Field
                label="Phone Number"
                optional
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="+1 234 567 8900"
              />
            </View>
          </FadeInView>

          <FadeInView index={2}>
            <Text accessibilityRole="header" style={[styles.sectionLabel, sectionColor]} maxFontSizeMultiplier={1.3}>SECURITY & PASSWORD</Text>
            <View style={cardStyle}>
              <Field
                label="New Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Leave blank to keep current password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                right={
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={theme.subtext} />
                  </TouchableOpacity>
                }
              />
            </View>
          </FadeInView>

          <FadeInView index={3}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Save account changes"
              accessibilityState={{ disabled: loading, busy: loading }}
              style={[styles.saveBtn, { backgroundColor: Colors.PRIMARY, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={onAccent} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={onAccent} />
                  <Text style={[styles.saveBtnText, { color: onAccent }]} maxFontSizeMultiplier={1.3}>Save Account Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </FadeInView>

          <FadeInView index={4}>
            <Text accessibilityRole="header" style={[styles.sectionLabel, sectionColor, { marginTop: Spacing.xxl }]} maxFontSizeMultiplier={1.3}>
              DATA PRIVACY (GDPR)
            </Text>
            <View style={cardStyle}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Export my travel archive as JSON"
                accessibilityState={{ disabled: exporting, busy: exporting }}
                style={styles.actionRow}
                onPress={handleExportData}
                disabled={exporting}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBadge, { backgroundColor: theme.badgeBg }]}>
                  <Ionicons name="download-outline" size={18} color={Colors.PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Export My Travel Archive</Text>
                  <Text style={[styles.actionDesc, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                    Download all your saved trips & account data as JSON
                  </Text>
                </View>
                {exporting ? (
                  <ActivityIndicator size="small" color={Colors.PRIMARY} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
                )}
              </TouchableOpacity>
            </View>
          </FadeInView>

          <FadeInView index={5}>
            <Text accessibilityRole="header" style={[styles.sectionLabel, { color: Colors.ERROR, marginTop: Spacing.xl }]} maxFontSizeMultiplier={1.3}>
              DANGER ZONE
            </Text>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: Colors.ERROR }]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Deactivate account. Temporarily pause your profile and sign out"
                style={styles.actionRow}
                onPress={handleDeactivate}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBadge, { backgroundColor: theme.badgeBg }]}>
                  <Ionicons name="pause-circle-outline" size={18} color={Colors.SECONDARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Deactivate Account</Text>
                  <Text style={[styles.actionDesc, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                    Temporarily pause your profile and sign out
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Delete account permanently. Wipes all saved trips, profile info and cloud credentials"
                accessibilityState={{ disabled: deleting, busy: deleting }}
                style={styles.actionRow}
                onPress={handleDeleteAccount}
                disabled={deleting}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBadge, { backgroundColor: theme.badgeBg }]}>
                  <Ionicons name="trash" size={18} color={Colors.ERROR} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: Colors.ERROR }]} maxFontSizeMultiplier={1.3}>Delete Account Permanently</Text>
                  <Text style={[styles.actionDesc, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                    Wipe all saved trips, profile info and cloud credentials
                  </Text>
                </View>
                {deleting ? (
                  <ActivityIndicator size="small" color={Colors.ERROR} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={Colors.ERROR} />
                )}
              </TouchableOpacity>
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.lg,
  },
  avatarSection: { alignItems: "center", marginBottom: Spacing.xl },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: Radius.full,
    borderWidth: 2,
  },
  cameraIconBox: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarHint: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, marginTop: Spacing.sm },
  avatarActionButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: Spacing.md,
  },
  avatarActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  avatarActionText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  sectionLabel: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontBold,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    marginTop: Spacing.sm,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  inputFieldBlock: { padding: Spacing.lg },
  labelWithBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  fieldLabel: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  optionalText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  verifiedText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontRegular,
  },
  eyeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.lg },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  saveBtnText: { fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: 64,
  },
  actionTitle: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  actionDesc: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, marginTop: 2 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
