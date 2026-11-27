import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Palette, Radius, Spacing, Typography, useTheme } from "./constants/theme";
import { TouchableOpacity } from "./ui/Touchable";
import { linkAnonymousWithEmail } from "./utils/AccountLinkingService";

/**
 * Shown when an anonymous guest hits their 2-trip limit (or taps "Unlock 8 More Free Trips").
 * Links the anonymous Firebase UID via `linkWithCredential()` and syncs `free_trips_limit` 2 -> 10.
 */
export default function AccountLinkModal({ visible, onClose, onLinked, tripsUsed = 2 }) {
  const theme = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLink = async () => {
    setError("");
    setLoading(true);
    try {
      const { entitlements } = await linkAnonymousWithEmail({ email, password, fullName });
      setEmail("");
      setPassword("");
      setFullName("");
      onLinked?.(entitlements);
      onClose?.();
    } catch (e) {
      setError(e?.message || "Could not link your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      statusBarTranslucent
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
              <Ionicons name="gift-outline" size={16} color={theme.primary} />
              <Text style={[styles.badgeText, { color: theme.primary }]} maxFontSizeMultiplier={1.3}>
                +8 FREE TRIPS
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close account link dialog"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
              Unlock 8 More Free Trips
            </Text>
            <Text style={[styles.subtitle, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
              You have used {tripsUsed} of 2 guest trips. Link a free account to keep your saved trips and immediately unlock 10 total free AI itineraries.
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.isDark ? Palette.dangerBgDark : Palette.dangerBgLight, borderColor: theme.isDark ? Palette.dangerBorderDark : Palette.dangerBorderLight }]}>
                <Text style={[styles.errorText, { color: theme.isDark ? Palette.dangerTextDark : Palette.dangerTextLight }]} maxFontSizeMultiplier={1.3}>
                  {error}
                </Text>
              </View>
            ) : null}

            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name (optional)"
              placeholderTextColor={theme.subtext}
              style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
              returnKeyType="next"
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={theme.subtext}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
              returnKeyType="next"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password (min 6 chars)"
              placeholderTextColor={theme.subtext}
              secureTextEntry
              style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
              returnKeyType="done"
              onSubmitEditing={handleLink}
            />

            <TouchableOpacity
              onPress={handleLink}
              disabled={loading}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Link account and unlock 8 free trips"
            >
              {loading ? (
                <ActivityIndicator color={Palette.white} />
              ) : (
                <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.3}>
                  Unlock 8 More Free Trips
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: Spacing.xl,
    maxHeight: "88%",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: Typography.sizeXs,
    fontFamily: Typography.fontBold,
    letterSpacing: 0.6,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.sizeXl,
    fontFamily: Typography.fontBold,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontRegular,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontMedium,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontRegular,
    marginBottom: Spacing.md,
  },
  primaryBtn: {
    minHeight: 50,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  primaryBtnText: {
    color: Palette.white,
    fontSize: Typography.sizeBase,
    fontFamily: Typography.fontBold,
  },
});

