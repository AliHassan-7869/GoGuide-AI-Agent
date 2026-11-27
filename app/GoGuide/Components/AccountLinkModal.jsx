import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Palette, Radius, Spacing, Typography, useTheme } from "./constants/theme";
import { TouchableOpacity } from "./ui/Touchable";
import {
  linkAnonymousWithEmail,
  refreshEmailVerificationAndSync,
  resendAccountVerificationEmail,
} from "./utils/AccountLinkingService";

/**
 * Shown when an anonymous guest hits their 2-trip limit (or taps "Unlock 8 More Free Trips").
 * Links the anonymous Firebase UID via `linkWithCredential()` and requires email verification
 * before upgrading `free_trips_limit` 2 -> 10 so fake/disposable emails cannot farm free trips.
 */
export default function AccountLinkModal({ visible, onClose, onLinked, tripsUsed = 2 }) {
  const theme = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const resetAndClose = () => {
    setError("");
    setInfo("");
    setAwaitingVerification(false);
    onClose?.();
  };

  const handleLink = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const { entitlements, needsEmailVerification } = await linkAnonymousWithEmail({
        email,
        password,
        fullName,
      });
      if (needsEmailVerification && (entitlements?.free_trips_limit ?? 2) < 10) {
        setPendingEmail(email.trim());
        setAwaitingVerification(true);
        setInfo("Verification link sent! Open your inbox, tap the link, then tap 'I've Verified My Email'.");
        return;
      }
      setEmail("");
      setPassword("");
      setFullName("");
      setAwaitingVerification(false);
      onLinked?.(entitlements);
      onClose?.();
    } catch (e) {
      setError(e?.message || "Could not link your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const { verified, entitlements } = await refreshEmailVerificationAndSync();
      if (!verified) {
        setError("Email not verified yet. Please click the link we sent to your inbox and try again.");
        return;
      }
      setEmail("");
      setPassword("");
      setFullName("");
      setAwaitingVerification(false);
      onLinked?.(entitlements);
      onClose?.();
    } catch (e) {
      setError(e?.message || "Could not check verification status right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await resendAccountVerificationEmail();
      setInfo("Verification email resent! Please check your inbox (and spam folder).");
    } catch (e) {
      setError(e?.message || "Could not resend verification email. Please wait a moment and try again.");
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
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
              <Ionicons name={awaitingVerification ? "mail-outline" : "gift-outline"} size={16} color={theme.primary} />
              <Text style={[styles.badgeText, { color: theme.primary }]} maxFontSizeMultiplier={1.3}>
                {awaitingVerification ? "VERIFY EMAIL" : "+8 FREE TRIPS"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={resetAndClose}
              accessibilityRole="button"
              accessibilityLabel="Close account link dialog"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
              {awaitingVerification ? "Verify Your Email to Unlock +8 Trips" : "Unlock 8 More Free Trips"}
            </Text>
            <Text style={[styles.subtitle, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
              {awaitingVerification
                ? `We sent a verification link to ${pendingEmail || "your email"}. Verify your real inbox to unlock 10 total free AI itineraries.`
                : `You have used ${tripsUsed} of 2 guest trips. Link and verify a real email account to keep your saved trips and unlock 10 total free AI itineraries.`}
            </Text>

            {info ? (
              <View style={[styles.infoBox, { backgroundColor: theme.badgeBg, borderColor: theme.primary }]}>
                <Text style={[styles.infoText, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                  {info}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.isDark ? Palette.dangerBgDark : Palette.dangerBgLight, borderColor: theme.isDark ? Palette.dangerBorderDark : Palette.dangerBorderLight }]}>
                <Text style={[styles.errorText, { color: theme.isDark ? Palette.dangerTextDark : Palette.dangerTextLight }]} maxFontSizeMultiplier={1.3}>
                  {error}
                </Text>
              </View>
            ) : null}

            {awaitingVerification ? (
              <>
                <TouchableOpacity
                  onPress={handleCheckVerified}
                  disabled={loading}
                  style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="I have verified my email"
                >
                  {loading ? (
                    <ActivityIndicator color={Palette.white} />
                  ) : (
                    <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.3}>
                      I&apos;ve Verified My Email
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResend}
                  disabled={loading}
                  style={[styles.secondaryBtn, { borderColor: theme.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Resend verification email"
                >
                  <Text style={[styles.secondaryBtnText, { color: theme.primary }]} maxFontSizeMultiplier={1.3}>
                    Resend Verification Email
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
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
                      Link &amp; Verify Email
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
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
  infoBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontMedium,
    lineHeight: 19,
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  secondaryBtnText: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontSemiBold,
  },
});

