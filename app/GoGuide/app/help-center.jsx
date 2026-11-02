import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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

const CATEGORIES = ["All", "AI Planner", "Budget & Trips", "Account & Offline"];

const FAQS = [
  {
    id: "1",
    category: "AI Planner",
    question: "How does the AI Trip Planner work?",
    answer:
      "Our AI model analyzes your destination, duration, budget, and travel preferences to generate a personalized, day-by-day itinerary with exact activities, time slots, and Google Maps coordinates using Google Gemini 2.5 Flash.",
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
  const router = useRouter();
  const theme = useTheme();
  const { userData } = useContext(CreateTripContext);

  const activeAccent = Colors.PRIMARY || "#0F172A";
  const badgeBg = theme.isDark ? "#222232" : "#F1F5F9";
  const iconColor = theme.isDark ? "#CBD5E1" : "#475569";

  // Search & FAQ States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedId, setExpandedId] = useState("1");
  const [feedbackState, setFeedbackState] = useState({});

  // Ticket Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [ticketCategory, setTicketCategory] = useState(TICKET_CATEGORIES[0]);
  const [ticketEmail, setTicketEmail] = useState(
    auth.currentUser?.email || userData?.email || ""
  );
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

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
      Alert.alert("Notice", "Could not submit ticket. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.header,
            borderBottomColor: theme.isDark ? "#20202F" : "#E2E8F0",
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.isDark ? theme.text : activeAccent}
          />
        </TouchableOpacity>
        <View>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.isDark ? theme.text : activeAccent },
            ]}
          >
            Help & Support
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.isDark ? "#94A3B8" : "#64748B" },
            ]}
          >
            Quick answers, AI assistance & direct support
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Support Channels Banner */}
        <View style={styles.channelsContainer}>
          {/* Channel 1: AI Copilot */}
          <TouchableOpacity
            style={[
              styles.channelCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.isDark ? "#262638" : "#E2E8F0",
              },
            ]}
            onPress={() => router.push("/(tabs)/ai-assistant")}
            activeOpacity={0.8}
          >
            <View style={[styles.channelIconBox, { backgroundColor: badgeBg }]}>
              <Ionicons name="sparkles" size={20} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.channelTitle, { color: theme.text }]}>
                  AI Copilot
                </Text>
                <View style={[styles.instantPill, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.instantText, { color: activeAccent }]}>24/7 Instant</Text>
                </View>
              </View>
              <Text style={[styles.channelDesc, { color: theme.subtext }]}>
                Instant trip adjustments, packing tips & itinerary troubleshooting.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
          </TouchableOpacity>

          {/* Channel 2: Submit Human Ticket */}
          <TouchableOpacity
            style={[
              styles.channelCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.isDark ? "#262638" : "#E2E8F0",
              },
            ]}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.channelIconBox, { backgroundColor: badgeBg }]}>
              <Ionicons name="headset-outline" size={20} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.channelTitle, { color: theme.text }]}>
                  Report Issue
                </Text>
                <View style={[styles.ticketPill, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.ticketPillText, { color: theme.subtext }]}>Developer Ticket</Text>
                </View>
              </View>
              <Text style={[styles.channelDesc, { color: theme.subtext }]}>
                Found a bug or need account help? Send a support ticket directly to our database.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
          </TouchableOpacity>
        </View>

        {/* Live Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.card,
              borderColor: theme.isDark ? "#262638" : "#E2E8F0",
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.subtext}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.text },
            ]}
            placeholder="Search FAQs (e.g. offline, budget, maps)..."
            placeholderTextColor={theme.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected
                    ? { backgroundColor: activeAccent, borderColor: activeAccent }
                    : {
                        backgroundColor: theme.card,
                        borderColor: theme.isDark ? "#262638" : "#E2E8F0",
                      },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected
                        ? "#FFFFFF"
                        : theme.isDark
                        ? "#CBD5E1"
                        : "#475569",
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Frequently Asked Questions
          </Text>
          <Text style={[styles.resultsCount, { color: theme.subtext }]}>
            {filteredFaqs.length} {filteredFaqs.length === 1 ? "answer" : "answers"}
          </Text>
        </View>

        {/* FAQs Accordion */}
        {filteredFaqs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="help-circle-outline" size={44} color={theme.subtext} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>
              No matching questions found.
            </Text>
            <TouchableOpacity
              style={[styles.askAiSmallBtn, { backgroundColor: activeAccent }]}
              onPress={() => router.push("/(tabs)/ai-assistant")}
            >
              <Text style={styles.askAiSmallText}>Ask AI Copilot instead ✨</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            const currentFeedback = feedbackState[faq.id];

            return (
              <View
                key={faq.id}
                style={[
                  styles.faqCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isExpanded
                      ? activeAccent
                      : theme.isDark
                      ? "#262638"
                      : "#E2E8F0",
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleExpand(faq.id)}
                  style={styles.faqHeader}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={[
                        styles.faqIconBadge,
                        {
                          backgroundColor: badgeBg,
                        },
                      ]}
                    >
                      <Ionicons
                        name="help"
                        size={15}
                        color={isExpanded ? activeAccent : iconColor}
                      />
                    </View>
                    <Text
                      style={[
                        styles.faqQuestion,
                        { color: theme.text },
                      ]}
                    >
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
                    <Text
                      style={[
                        styles.faqAnswer,
                        { color: theme.isDark ? "#CBD5E1" : "#475569" },
                      ]}
                    >
                      {faq.answer}
                    </Text>

                    {/* Feedback Micro-Interaction */}
                    <View style={[styles.feedbackRow, { borderTopColor: theme.border }]}>
                      <Text
                        style={[
                          styles.feedbackPrompt,
                          { color: theme.subtext },
                        ]}
                      >
                        Was this helpful?
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.feedbackBtn,
                          { backgroundColor: badgeBg },
                          currentFeedback === true && { backgroundColor: activeAccent },
                        ]}
                        onPress={() => handleFeedback(faq.id, true)}
                      >
                        <Text style={[styles.feedbackText, currentFeedback === true && { color: "#FFFFFF" }]}>👍 Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.feedbackBtn,
                          { backgroundColor: badgeBg },
                          currentFeedback === false && { backgroundColor: activeAccent },
                        ]}
                        onPress={() => handleFeedback(faq.id, false)}
                      >
                        <Text style={[styles.feedbackText, currentFeedback === false && { color: "#FFFFFF" }]}>👎 No</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Support Ticket Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.card },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.modalIconBox, { backgroundColor: badgeBg }]}>
                  <Ionicons name="paper-plane-outline" size={18} color={activeAccent} />
                </View>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.text },
                    ]}
                  >
                    Submit Support Ticket
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.subtext }]}>
                    Direct report saved to developer database
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {ticketSuccess ? (
              <View style={styles.successState}>
                <Ionicons name="checkmark-circle" size={50} color="#10B981" />
                <Text style={[styles.successTitle, { color: theme.text }]}>
                  Ticket Submitted Successfully!
                </Text>
                <Text style={[styles.successDesc, { color: theme.subtext }]}>
                  Your message has been logged in our Firestore database. Our team will review this shortly!
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Category Picker */}
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.text },
                  ]}
                >
                  Issue Type
                </Text>
                <View style={styles.ticketCategoryWrap}>
                  {TICKET_CATEGORIES.map((cat) => {
                    const active = ticketCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.ticketCatChip,
                          active
                            ? { backgroundColor: activeAccent, borderColor: activeAccent }
                            : {
                                backgroundColor: badgeBg,
                                borderColor: theme.border,
                              },
                        ]}
                        onPress={() => setTicketCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.ticketCatText,
                            { color: active ? "#FFFFFF" : theme.isDark ? "#CBD5E1" : "#475569" },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Email Input */}
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.text, marginTop: 14 },
                  ]}
                >
                  Your Email
                </Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: badgeBg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.subtext}
                  value={ticketEmail}
                  onChangeText={setTicketEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {/* Issue Description */}
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.text, marginTop: 14 },
                  ]}
                >
                  Describe the Issue
                </Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    styles.textArea,
                    {
                      backgroundColor: badgeBg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="What happened? Steps to reproduce..."
                  placeholderTextColor={theme.subtext}
                  value={ticketMessage}
                  onChangeText={setTicketMessage}
                  multiline={true}
                  numberOfLines={4}
                />

                {/* Submit Action */}
                <TouchableOpacity
                  style={[
                    styles.submitTicketBtn,
                    { backgroundColor: activeAccent, opacity: isSubmitting || !ticketMessage.trim() ? 0.6 : 1 },
                  ]}
                  onPress={handleSubmitTicket}
                  disabled={isSubmitting || !ticketMessage.trim()}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                      <Text style={styles.submitTicketText}>Send Ticket to Developer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  channelsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  channelIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  channelTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  instantPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  instantText: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  ticketPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ticketPillText: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
  },
  channelDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 17,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Outfit-Regular",
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  resultsCount: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
  },
  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  faqIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  faqQuestion: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    flex: 1,
  },
  faqBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  faqAnswer: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    lineHeight: 20,
    marginTop: 8,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  feedbackPrompt: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
  },
  feedbackBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  feedbackText: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
    color: "#64748B",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
  },
  askAiSmallBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 4,
  },
  askAiSmallText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
  },
  modalSubtitle: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    marginBottom: 6,
  },
  ticketCategoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ticketCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  ticketCatText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Outfit-Regular",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  submitTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 20,
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
  },
  submitTicketText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  successState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    gap: 10,
  },
  successTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
  },
  successDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
