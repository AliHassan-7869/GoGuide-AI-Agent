import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { openExternalUrl } from "../Components/utils/openExternalUrl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../Components/constants/constants";
import { Palette, Radius, Spacing, Typography, useTheme } from "../Components/constants/theme";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { TouchableOpacity } from "../Components/ui/Touchable";
import {
  BLOOD_TYPES,
  STORAGE_KEY,
  cleanPhone,
  emptyEmergencyInfo,
  sanitizeEmergencyInfo,
  telLink,
  validateEmergencyInfo,
} from "../Components/utils/emergencyInfo";
import { goBack } from "../Components/utils/navigation";
import { secureStorage } from "../Components/utils/secureStorage";

/**
 * Personal emergency contacts and medical details. Saved ONLY on this device (never uploaded),
 * so a traveler can show them to someone who is helping.
 */
export default function EmergencyInfo() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const accent = Colors.PRIMARY || Palette.brand;

  const [info, setInfo] = useState(emptyEmergencyInfo());
  const [loaded, setLoaded] = useState(false);
  const [problems, setProblems] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    secureStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (alive && raw) setInfo(sanitizeEmergencyInfo(JSON.parse(raw)));
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const setField = (key, value) => {
    setSaved(false);
    setInfo((prev) => ({ ...prev, [key]: value }));
  };
  const setContact = (index, key, value) => {
    setSaved(false);
    setInfo((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => (i === index ? { ...c, [key]: key === "phone" ? cleanPhone(value) : value } : c)),
    }));
  };

  const handleSave = async () => {
    const clean = sanitizeEmergencyInfo(info);
    const found = validateEmergencyInfo(clean);
    setProblems(found);
    if (found.length) return;
    try {
      await secureStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      setInfo(clean);
      setSaved(true);
    } catch {
      setProblems(["Could not save on this device. Please try again."]);
    }
  };

  const clearAll = async () => {
    try {
      await secureStorage.removeItem(STORAGE_KEY);
    } catch {}
    setInfo(emptyEmergencyInfo());
    setProblems([]);
    setSaved(false);
  };

  const handleClear = () => {
    Alert.alert("Clear emergency info?", "This removes your contacts and medical details from this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearAll },
    ]);
  };

  const callContact = (phone) => {
    const link = telLink(phone);
    if (link) openExternalUrl(link, { allowContact: true });
  };

  const inputStyle = [styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }];
  const label = (text) => (
    <Text style={[styles.label, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
      {text}
    </Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Emergency Info" subtitle="Stored only on this device" onBack={() => goBack(router)} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 84 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.privacy, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={accent} />
            <Text style={[styles.privacyText, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
              This stays on your phone. It is never uploaded. Fill in what you are comfortable with.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
            Emergency contacts
          </Text>
          {info.contacts.map((c, i) => (
            <View key={i} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                Contact {i + 1}
              </Text>
              <TextInput
                accessibilityLabel={`Contact ${i + 1} name`}
                style={inputStyle}
                placeholder="Full name"
                placeholderTextColor={theme.subtext}
                value={c.name}
                onChangeText={(v) => setContact(i, "name", v)}
                maxLength={60}
                maxFontSizeMultiplier={1.3}
              />
              <TextInput
                accessibilityLabel={`Contact ${i + 1} phone`}
                style={[inputStyle, styles.gap]}
                placeholder="Phone, e.g. +92 300 1234567"
                placeholderTextColor={theme.subtext}
                value={c.phone}
                onChangeText={(v) => setContact(i, "phone", v)}
                keyboardType="phone-pad"
                maxLength={25}
                maxFontSizeMultiplier={1.3}
              />
              <TextInput
                accessibilityLabel={`Contact ${i + 1} relationship`}
                style={[inputStyle, styles.gap]}
                placeholder="Relationship (mother, friend...)"
                placeholderTextColor={theme.subtext}
                value={c.relation}
                onChangeText={(v) => setContact(i, "relation", v)}
                maxLength={40}
                maxFontSizeMultiplier={1.3}
              />
              {telLink(c.phone) ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${c.name || `contact ${i + 1}`}`}
                  style={[styles.callBtn, { borderColor: accent }]}
                  onPress={() => callContact(c.phone)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call-outline" size={18} color={accent} />
                  <Text style={[styles.callBtnText, { color: accent }]} maxFontSizeMultiplier={1.3}>
                    Call {c.name || "this contact"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
            Medical details
          </Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {label("Blood type")}
            <View style={styles.chipRow}>
              {BLOOD_TYPES.map((t) => {
                const active = info.bloodType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    accessibilityRole="button"
                    accessibilityLabel={`Blood type ${t}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => setField("bloodType", active ? "" : t)}
                    style={[
                      styles.chip,
                      { borderColor: active ? accent : theme.border, backgroundColor: active ? accent : theme.input },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: active ? Palette.white : theme.text }]} maxFontSizeMultiplier={1.3}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {label("Allergies")}
            <TextInput
              accessibilityLabel="Allergies"
              style={[inputStyle, styles.multiline]}
              placeholder="Food, medicine, insect stings..."
              placeholderTextColor={theme.subtext}
              value={info.allergies}
              onChangeText={(v) => setField("allergies", v)}
              multiline
              maxLength={300}
              maxFontSizeMultiplier={1.3}
            />
            {label("Medications")}
            <TextInput
              accessibilityLabel="Medications"
              style={[inputStyle, styles.multiline]}
              placeholder="Medicines you take regularly"
              placeholderTextColor={theme.subtext}
              value={info.medications}
              onChangeText={(v) => setField("medications", v)}
              multiline
              maxLength={300}
              maxFontSizeMultiplier={1.3}
            />
            {label("Travel insurance")}
            <TextInput
              accessibilityLabel="Travel insurance"
              style={inputStyle}
              placeholder="Provider and policy number"
              placeholderTextColor={theme.subtext}
              value={info.insurance}
              onChangeText={(v) => setField("insurance", v)}
              maxLength={120}
              maxFontSizeMultiplier={1.3}
            />
            {label("Other notes")}
            <TextInput
              accessibilityLabel="Other notes"
              style={[inputStyle, styles.multiline]}
              placeholder="Anything a helper should know"
              placeholderTextColor={theme.subtext}
              value={info.notes}
              onChangeText={(v) => setField("notes", v)}
              multiline
              maxLength={400}
              maxFontSizeMultiplier={1.3}
            />
          </View>

          {problems.length ? (
            <View style={styles.problemBox} accessibilityRole="alert">
              {problems.map((p) => (
                <Text key={p} style={[styles.problemText, { color: theme.isDark ? Palette.dangerLight : Palette.dangerDark }]} maxFontSizeMultiplier={1.3}>
                  • {p}
                </Text>
              ))}
            </View>
          ) : null}
          {saved ? (
            <View style={styles.savedRow} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle" size={18} color={Palette.success} />
              <Text style={[styles.savedText, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                Saved on this device
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Save emergency info"
            style={[styles.saveBtn, { backgroundColor: accent, opacity: loaded ? 1 : 0.6 }]}
            onPress={handleSave}
            disabled={!loaded}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText} maxFontSizeMultiplier={1.3}>
              Save
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear all emergency info"
            style={styles.clearBtn}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearBtnText, { color: theme.isDark ? Palette.dangerLight : Palette.dangerDark }]} maxFontSizeMultiplier={1.3}>
              Clear all
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.lg },
  privacy: { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  privacyText: { flex: 1, minWidth: 0, fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, lineHeight: 18 },
  sectionTitle: { fontSize: Typography.sizeLg, fontFamily: Typography.fontBold, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  card: { padding: Spacing.lg, borderRadius: Radius.card, borderWidth: 1, marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, textTransform: "uppercase", marginBottom: Spacing.sm },
  label: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium, marginTop: Spacing.md, marginBottom: Spacing.xs },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular },
  gap: { marginTop: Spacing.sm },
  multiline: { minHeight: 72, textAlignVertical: "top", paddingTop: Spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: { minWidth: 56, minHeight: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.md },
  chipText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  callBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48, marginTop: Spacing.md, borderWidth: 1, borderRadius: Radius.md },
  callBtnText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold, flexShrink: 1 },
  problemBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: "rgba(239, 68, 68, 0.12)" },
  problemText: { color: Palette.dangerDark, fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium, lineHeight: 18 },
  savedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: Spacing.md },
  savedText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium, flexShrink: 1 },
  saveBtn: { minHeight: 52, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg },
  saveBtnText: { color: Palette.white, fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  clearBtn: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: Spacing.sm },
  clearBtnText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
});
