import { Ionicons } from "@expo/vector-icons";
import useBackDismiss from "../hooks/useBackDismiss";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useContext, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView } from "react-native";
import { Colors } from "../Components/constants/constants";
import { Radius, Spacing, Typography, lightTheme, useTheme } from "../Components/constants/theme";
import EmptyState from "../Components/ui/EmptyState";
import FadeInView from "../Components/ui/FadeInView";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { auth, db } from "../Configs/FirebaseConfig";
import { CreateTripContext } from "../context/CreateTripContext";

import { TouchableOpacity } from "../Components/ui/Touchable";
const CATEGORIES = ["All", "AI Planner", "Budget & Trips", "Account & Offline"];

const FAQS = [
  {
    id: "1",
    category: "AI Planner",
    question: "How does the AI Trip Planner work?",
    answer:
      "Our AI model analyses your destination, duration, budget, and travel preferences to generate a personalised, day-by-day itinerary with exact activities, time slots, and Google Maps coordinates using Google Gemini 2.5 Flash.",
  },
  {
    id: "2",
    category: "AI Planner",
    question: "Can I customize the daily itinerary?",
    answer:
      "Yes! You can filter activities by Day 1, Day 2, etc. in 'My Trip', or use the 'AI Copilot' tab to ask for alternate spots, halal food recommendations, or schedule tweaks in real-time.",
  },
  {
    id: "3",
    category: "Budget & Trips",
    question: "Are the estimated travel costs accurate?",
    answer:
      "Budgets are calculated using real-world averages for budget, moderate, and luxury travel categories. Flight and hotel rates fluctuate in real-time, so we recommend verifying final prices via the booking links provided.",
  },
  {
    id: "4",
    category: "Budget & Trips",
    question: "How do I open locations in Google Maps?",
    answer:
      "In the 'My Trip' screen, every hotel card and daily activity has a 1-tap 'Map 📍' button that directly opens the exact coordinates in Google Maps for turn-by-turn navigation.",
  },
  {
    id: "5",
    category: "Account & Offline",
    question: "Can I save my trips offline?",
    answer:
      "Your trips are automatically synced to your cloud account so they are never lost. Offline access and PDF export are actively in development for the upcoming release!",
  },
  {
    id: "6",
    category: "Account & Offline",
    question: "How do I update my profile and dark mode?",
    answer:
      "Go to the Profile tab in the bottom bar. Select 'Account & Security' to change your credentials, or go to 'Preferences' to toggle Dark Mode, units, and dining preferences.",
  },
];

const TICKET_CATEGORIES = [
  "Bug / Glitch",
  "Trip Generation Issue",
  "Account & Login",
  "Feature Suggestion",
  "Other",
];

export default function HelpCenter() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { userData } = useContext(CreateTripContext);

  const activeAccent = Colors.PRIMARY || "#0F172A";
  const badgeBg = theme.badgeBg;
  const iconColor = theme.subtext;
  const onAccent = lightTheme.card;

  // Search & FAQ States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedId, setExpandedId] = useState("1");
  const [feedbackState, setFeedbackState] = useState({});

  // Ticket Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  // Android back closes the in-page form instead of leaving the screen
  useBackDismiss(isModalVisible, () => setIsModalVisible(false));
  const [ticketCategory, setTicketCategory] = useState(TICKET_CATEGORIES[0]);
  const [ticketEmail, setTicketEmail] = useState(
    auth.currentUser?.email || userData?.email || ""
  );
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [ticketError, setTicketError] = useState("");

  // Filter FAQs based on category and search query
  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleFeedback = (id, isHelpful) => {
    setFeedbackState((prev) => ({ ...prev, [id]: isHelpful }));
  };

  const handleSubmitTicket = async () => {
    if (!ticketMessage.trim()) {
      Alert.alert("Notice", "Please describe your issue before submitting.");
      return;
    }

    setIsSubmitting(true);
    setTicketError("");
    try {
      await addDoc(collection(db, "SupportTickets"), {
        category: ticketCategory,
        message: ticketMessage.trim(),
        userEmail: ticketEmail.trim() || "anonymous@goguide.ai",
        userId: auth.currentUser?.uid || "guest",
        platform: Platform.OS,
        status: "open",
        createdAt: serverTimestamp(),
      });

      setTicketSuccess(true);
      setTicketMessage("");
      setTimeout(() => {
        setTicketSuccess(false);
        setIsModalVisible(false);
      }, 2000);
    } catch (e) {
      console.error("Error submitting ticket:", e);
      setTicketError("Could not submit your ticket. Please check your internet connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ticket form is a full-screen view within the same route (no modal)
  if (isModalVisible) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ScreenHeader
          title="Submit Ticket"
          subtitle="Direct report saved to developer database"
          onBack={() => setIsModalVisible(false)}
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 84 }]}
            showsVerticalScrollIndicator={false}
          >
            {ticketSuccess ? (
              <EmptyState
                icon="checkmark-circle-outline"
                title="Ticket submitted successfully"
                text="Your message has been logged. Our team will review it shortly."
                actionLabel="Back to Help"
                onAction={() => {
                  setTicketSuccess(false);
                  setIsModalVisible(false);
                }}
              />
            ) : (
              <FadeInView index={0} style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.inputLabel, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Issue Type</Text>
                <View style={styles.ticketCategoryWrap} accessibilityRole="radiogroup">
                  {TICKET_CATEGORIES.map((cat) => {
                    const active = ticketCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        accessibilityRole="radio"
                        accessibilityLabel={cat}
                        accessibilityState={{ selected: active, checked: active }}
                        style={[
                          styles.ticketCatChip,
                          active
                            ? { backgroundColor: activeAccent, borderColor: activeAccent }
                            : { backgroundColor: badgeBg, borderColor: theme.border },
                        ]}
                        onPress={() => setTicketCategory(cat)}
                      >
                        {active ? <Ionicons name="checkmark" size={14} color={onAccent} /> : null}
                        <Text style={[styles.ticketCatText, { color: active ? onAccent : theme.text }]} maxFontSizeMultiplier={1.3}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.inputLabel, { color: theme.text, marginTop: Spacing.lg }]} maxFontSizeMultiplier={1.3}>Your Email</Text>
                <TextInput
                  accessibilityLabel="Your email"
                  style={[styles.inputBox, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.subtext}
                  value={ticketEmail}
                  onChangeText={setTicketEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxFontSizeMultiplier={1.3}
                />

                <Text style={[styles.inputLabel, { color: theme.text, marginTop: Spacing.lg }]} maxFontSizeMultiplier={1.3}>Describe the Issue</Text>
                <TextInput
                  accessibilityLabel="Describe the issue"
                  style={[styles.inputBox, styles.textArea, { backgroundColor: theme.input, borderColor: theme.border, color: theme.inputText }]}
                  placeholder="What happened? Steps to reproduce..."
                  placeholderTextColor={theme.subtext}
                  value={ticketMessage}
                  onChangeText={setTicketMessage}
                  multiline={true}
                  numberOfLines={4}
                  maxFontSizeMultiplier={1.3}
                />

                {ticketError ? (
                  <View style={styles.errorRow} accessibilityRole="alert">
                    <Ionicons name="alert-circle-outline" size={18} color={Colors.ERROR} />
                    <Text style={[styles.errorText, { color: Colors.ERROR }]} maxFontSizeMultiplier={1.3}>{ticketError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={ticketError ? "Retry sending ticket" : "Send ticket to developer"}
                  accessibilityState={{ disabled: isSubmitting || !ticketMessage.trim(), busy: isSubmitting }}
                  style={[styles.submitTicketBtn, { backgroundColor: activeAccent, opacity: isSubmitting || !ticketMessage.trim() ? 0.6 : 1 }]}
                  onPress={handleSubmitTicket}
                  disabled={isSubmitting || !ticketMessage.trim()}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={onAccent} />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color={onAccent} />
                      <Text style={[styles.submitTicketText, { color: onAccent }]} maxFontSizeMultiplier={1.3}>
                        {ticketError ? "Try again" : "Send Ticket to Developer"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </FadeInView>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScreenHeader
        title="Help & Support"
        subtitle="Quick answers, AI assistance & direct support"
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 84 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.channelsContainer}>
            <FadeInView index={0}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="AI Copilot, 24/7 instant help"
                style={[styles.channelCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => router.push("/(tabs)/ai-assistant")}
                activeOpacity={0.8}
              >
                <View style={[styles.channelIconBox, { backgroundColor: badgeBg }]}>
                  <Ionicons name="sparkles" size={20} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.channelTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>AI Copilot</Text>
                    <View style={[styles.instantPill, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.instantText, { color: activeAccent }]} maxFontSizeMultiplier={1.3}>24/7 Instant</Text>
                    </View>
                  </View>
                  <Text style={[styles.channelDesc, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                    Instant trip adjustments, packing tips & itinerary troubleshooting.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
              </TouchableOpacity>
            </FadeInView>

            <FadeInView index={1}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Report an issue, developer ticket"
                style={[styles.channelCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setIsModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.channelIconBox, { backgroundColor: badgeBg }]}>
                  <Ionicons name="headset-outline" size={20} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.channelTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Report Issue</Text>
                    <View style={[styles.ticketPill, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.ticketPillText, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>Developer Ticket</Text>
                    </View>
                  </View>
                  <Text style={[styles.channelDesc, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                    Found a bug or need account help? Send a support ticket directly to our database.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
              </TouchableOpacity>
            </FadeInView>
          </View>

          <FadeInView index={2} style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.subtext} />
            <TextInput
              accessibilityLabel="Search frequently asked questions"
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search FAQs (e.g. offline, budget, maps)..."
              placeholderTextColor={theme.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              maxFontSizeMultiplier={1.3}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearchQuery("")}
                style={styles.clearBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={18} color={theme.subtext} />
              </TouchableOpacity>
            )}
          </FadeInView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter: ${cat}`}
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.categoryPill,
                    isSelected
                      ? { backgroundColor: activeAccent, borderColor: activeAccent }
                      : { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryText, { color: isSelected ? onAccent : theme.text }]} maxFontSizeMultiplier={1.3}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionHeaderRow}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
              Frequently Asked Questions
            </Text>
            <Text style={[styles.resultsCount, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
              {filteredFaqs.length} {filteredFaqs.length === 1 ? "answer" : "answers"}
            </Text>
          </View>

          {filteredFaqs.length === 0 ? (
            <EmptyState
              icon="help-circle-outline"
              title="No matching questions found"
              text="Try a different search, or ask the AI Copilot."
              actionLabel="Ask AI Copilot instead"
              onAction={() => router.push("/(tabs)/ai-assistant")}
              secondaryLabel="Clear search"
              onSecondary={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
            />
          ) : (
            filteredFaqs.map((faq, index) => {
              const isExpanded = expandedId === faq.id;
              const currentFeedback = feedbackState[faq.id];

              return (
                <FadeInView
                  key={faq.id}
                  index={index}
                  style={[styles.faqCard, { backgroundColor: theme.card, borderColor: isExpanded ? activeAccent : theme.border }]}
                >
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={faq.question}
                    accessibilityState={{ expanded: isExpanded }}
                    onPress={() => toggleExpand(faq.id)}
                    style={styles.faqHeader}
                    activeOpacity={0.8}
                  >
                    <View style={styles.faqHeaderLeft}>
                      <View style={[styles.faqIconBadge, { backgroundColor: badgeBg }]}>
                        <Ionicons name="help" size={15} color={isExpanded ? activeAccent : iconColor} />
                      </View>
                      <Text style={[styles.faqQuestion, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                        {faq.question}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={isExpanded ? activeAccent : theme.subtext}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.faqBody, { borderTopColor: theme.border }]}>
                      <Text style={[styles.faqAnswer, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                        {faq.answer}
                      </Text>

                      <View style={[styles.feedbackRow, { borderTopColor: theme.border }]}>
                        <Text style={[styles.feedbackPrompt, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                          Was this helpful?
                        </Text>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Yes, this was helpful"
                          accessibilityState={{ selected: currentFeedback === true }}
                          style={[styles.feedbackBtn, { backgroundColor: badgeBg }, currentFeedback === true && { backgroundColor: activeAccent }]}
                          onPress={() => handleFeedback(faq.id, true)}
                        >
                          <Text style={[styles.feedbackText, { color: theme.text }, currentFeedback === true && { color: onAccent }]} maxFontSizeMultiplier={1.3}>
                            {currentFeedback === true ? "✓ " : ""}👍 Yes
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="No, this was not helpful"
                          accessibilityState={{ selected: currentFeedback === false }}
                          style={[styles.feedbackBtn, { backgroundColor: badgeBg }, currentFeedback === false && { backgroundColor: activeAccent }]}
                          onPress={() => handleFeedback(faq.id, false)}
                        >
                          <Text style={[styles.feedbackText, { color: theme.text }, currentFeedback === false && { color: onAccent }]} maxFontSizeMultiplier={1.3}>
                            {currentFeedback === false ? "✓ " : ""}👎 No
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </FadeInView>
              );
            })
          )}
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
  channelsContainer: { gap: 10, marginBottom: Spacing.lg },
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.md,
    minHeight: 64,
  },
  channelIconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: 3,
  },
  channelTitle: { fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  instantPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.md },
  instantText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  ticketPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.md },
  ticketPillText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },
  channelDesc: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, lineHeight: 17 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 10,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontRegular,
  },
  clearBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -Spacing.md },
  categoryScroll: { gap: Spacing.sm, paddingBottom: Spacing.lg },
  categoryPill: {
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  categoryText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: { flexShrink: 1, fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  resultsCount: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular },
  faqCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    minHeight: 56,
  },
  faqHeaderLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  faqIconBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  faqQuestion: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold, flex: 1 },
  faqBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  faqAnswer: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontRegular,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  feedbackPrompt: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular },
  feedbackBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },
  formCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  inputLabel: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, marginBottom: 6 },
  ticketCategoryWrap: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  ticketCatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  ticketCatText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },
  inputBox: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontRegular,
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.md },
  errorText: { flex: 1, fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular },
  submitTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  submitTicketText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
});
