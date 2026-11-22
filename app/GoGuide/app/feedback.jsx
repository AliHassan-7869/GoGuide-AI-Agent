import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../Components/constants/constants";
import { Palette, Radius, Spacing, Typography, useTheme } from "../Components/constants/theme";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { TouchableOpacity } from "../Components/ui/Touchable";
import { MAX_COMMENT, buildFeedbackMessage, canSubmitFeedback, starLabel } from "../Components/utils/feedback";
import { goBack } from "../Components/utils/navigation";
import { auth, db } from "../Configs/FirebaseConfig";

/** Rate the app and send feedback. Stored as a "Feedback" support ticket (same place as Help Center tickets). */
export default function Feedback() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const accent = Colors.PRIMARY || Palette.brand;

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (sending || !canSubmitFeedback(stars)) return;
    setSending(true);
    setError("");
    try {
      await addDoc(collection(db, "SupportTickets"), {
        category: "Feedback",
        message: buildFeedbackMessage(stars, comment),
        userEmail: auth.currentUser?.email || "anonymous@goguide.ai",
        userId: auth.currentUser?.uid || "guest",
        platform: Platform.OS,
        status: "open",
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch {
      setError("We couldn't send that just now. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Rate & Feedback" subtitle="Tell us what to improve" onBack={() => goBack(router)} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 84 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {done ? (
            <View style={[styles.card, styles.center, { backgroundColor: theme.card, borderColor: theme.border }]} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle" size={56} color={Palette.success} />
              <Text style={[styles.thanksTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                Thank you!
              </Text>
              <Text style={[styles.thanksText, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                Your feedback helps us make GoGuide better for every traveler.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Done"
                style={[styles.primaryBtn, { backgroundColor: accent }]}
                onPress={() => goBack(router)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.3}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
                How is GoGuide working for you?
              </Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
                    accessibilityState={{ selected: stars === n }}
                    onPress={() => setStars(n)}
                    style={styles.starBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={n <= stars ? "star" : "star-outline"} size={36} color={n <= stars ? Palette.warning : theme.subtext} />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.starCaption, { color: theme.subtext }]} maxFontSizeMultiplier={1.3} accessibilityLiveRegion="polite">
                {starLabel(stars)}
              </Text>

              <Text style={[styles.label, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                Anything we should know? (optional)
              </Text>
              <TextInput
                accessibilityLabel="Your feedback"
                style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
                placeholder="What do you love? What should we fix?"
                placeholderTextColor={theme.subtext}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={MAX_COMMENT}
                maxFontSizeMultiplier={1.3}
              />

              {error ? (
                <View style={styles.errorBox} accessibilityRole="alert">
                  <Text style={[styles.errorText, { color: theme.isDark ? Palette.dangerLight : Palette.dangerDark }]} maxFontSizeMultiplier={1.3}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Send feedback"
                accessibilityState={{ disabled: !canSubmitFeedback(stars) || sending }}
                style={[styles.primaryBtn, { backgroundColor: accent, opacity: canSubmitFeedback(stars) && !sending ? 1 : 0.5 }]}
                onPress={submit}
                disabled={!canSubmitFeedback(stars) || sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color={Palette.white} />
                ) : (
                  <Text style={styles.primaryBtnText} maxFontSizeMultiplier={1.3}>
                    Send feedback
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.lg },
  card: { padding: Spacing.lg, borderRadius: Radius.card, borderWidth: 1 },
  center: { alignItems: "center" },
  title: { fontSize: Typography.sizeLg, fontFamily: Typography.fontBold, textAlign: "center" },
  starRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: Spacing.lg },
  starBtn: { minWidth: 52, minHeight: 52, alignItems: "center", justifyContent: "center" },
  starCaption: { textAlign: "center", fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium, marginTop: Spacing.xs },
  label: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  input: { minHeight: 110, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, textAlignVertical: "top" },
  errorBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: "rgba(239, 68, 68, 0.12)" },
  errorText: { color: Palette.dangerDark, fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium, lineHeight: 18 },
  primaryBtn: { minHeight: 52, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, alignSelf: "stretch" },
  primaryBtnText: { color: Palette.white, fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  thanksTitle: { fontSize: Typography.sizeXl, fontFamily: Typography.fontBold, marginTop: Spacing.md },
  thanksText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, textAlign: "center", marginTop: Spacing.sm },
});
