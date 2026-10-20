import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
      "Go to the Profile tab in the bottom bar. Select 'Edit Profile' to change your name and photo, or go to 'Preferences' to toggle Dark Mode and push notifications.",
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
      alert("Please describe your issue before submitting.");
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
      alert("Could not submit ticket. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? "#0F0F14" : "#F8FAFC" }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.isDark ? "#161622" : "#FFFFFF",
            borderBottomColor: theme.isDark ? "#222233" : "#E2E8F0",
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
                backgroundColor: theme.isDark ? "#1A1A28" : "#EDE9FE",
                borderColor: theme.isDark ? "#2E2E45" : "#DDD6FE",
              },
            ]}
            onPress={() => router.push("/(tabs)/ai-assistant")}
            activeOpacity={0.8}
          >
            <View style={styles.channelIconBoxPurple}>
              <Ionicons name="sparkles" size={24} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.channelTitle, { color: theme.isDark ? "#FFFFFF" : "#4C1D95" }]}>
                  AI Copilot
                </Text>
                <View style={styles.instantPill}>
                  <Text style={styles.instantText}>24/7 Instant</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.channelDesc,
                  { color: theme.isDark ? "#94A3B8" : "#6D28D9" },
                ]}
              >
                Instant trip adjustments, packing tips & itinerary troubleshooting.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
          </TouchableOpacity>

          {/* Channel 2: Submit Human Ticket */}
          <TouchableOpacity
            style={[
              styles.channelCard,
              {
                backgroundColor: theme.isDark ? "#1E1E2C" : "#FFFFFF",
                borderColor: theme.isDark ? "#2D2D42" : "#E2E8F0",
              },
            ]}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.channelIconBoxBlue}>
              <Ionicons name="headset-outline" size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={[styles.channelTitle, { color: theme.isDark ? "#FFFFFF" : "#1E293B" }]}>
                  Report Issue
                </Text>
                <View style={styles.ticketPill}>
                  <Text style={styles.ticketPillText}>Direct to Developer</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.channelDesc,
                  { color: theme.isDark ? "#94A3B8" : "#64748B" },
                ]}
              >
                Found a bug or need account help? Send a support ticket directly to our database.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Live Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.isDark ? "#1E1E2C" : "#FFFFFF",
              borderColor: theme.isDark ? "#2D2D42" : "#E2E8F0",
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.isDark ? "#94A3B8" : "#64748B"}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.isDark ? "#FFFFFF" : "#0F172A" },
            ]}
            placeholder="Search FAQs (e.g. offline, budget, maps)..."
            placeholderTextColor={theme.isDark ? "#64748B" : "#94A3B8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
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
                    ? { backgroundColor: Colors.PRIMARY || "#0F172A", borderColor: Colors.PRIMARY || "#0F172A" }
                    : {
                        backgroundColor: theme.isDark ? "#1E1E2C" : "#FFFFFF",
                        borderColor: theme.isDark ? "#2D2D42" : "#E2E8F0",
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
                        ? "#E2E8F0"
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
          <Text style={[styles.sectionTitle, { color: theme.isDark ? "#FFFFFF" : "#0F172A" }]}>
            Frequently Asked Questions
          </Text>
          <Text style={styles.resultsCount}>
            {filteredFaqs.length} {filteredFaqs.length === 1 ? "answer" : "answers"}
          </Text>
        </View>

        {/* FAQs Accordion */}
        {filteredFaqs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="help-circle-outline" size={48} color="#94A3B8" />
            <Text style={[styles.emptyText, { color: theme.isDark ? "#94A3B8" : "#64748B" }]}>
              No matching questions found.
            </Text>
            <TouchableOpacity
              style={styles.askAiSmallBtn}
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
                    backgroundColor: theme.isDark ? "#1A1A26" : "#FFFFFF",
                    borderColor: isExpanded
                      ? "#7C3AED"
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
                          backgroundColor: isExpanded
                            ? "rgba(124, 58, 237, 0.15)"
                            : theme.isDark
                            ? "#232334"
                            : "#F1F5F9",
                        },
                      ]}
                    >
                      <Ionicons
                        name="help"
                        size={16}
                        color={isExpanded ? "#7C3AED" : theme.isDark ? "#94A3B8" : "#64748B"}
                      />
                    </View>
                    <Text
                      style={[
                        styles.faqQuestion,
                        { color: theme.isDark ? "#FFFFFF" : "#0F172A" },
                      ]}
                    >
                      {faq.question}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={isExpanded ? "#7C3AED" : "#94A3B8"}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text
                      style={[
                        styles.faqAnswer,
                        { color: theme.isDark ? "#CBD5E1" : "#475569" },
                      ]}
                    >
                      {faq.answer}
                    </Text>

                    {/* Feedback Micro-Interaction */}
                    <View style={styles.feedbackRow}>
                      <Text
                        style={[
                          styles.feedbackPrompt,
                          { color: theme.isDark ? "#64748B" : "#94A3B8" },
                        ]}
                      >
                        Was this helpful?
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.feedbackBtn,
                          currentFeedback === true && styles.feedbackBtnActive,
                        ]}
                        onPress={() => handleFeedback(faq.id, true)}
                      >
                        <Text style={styles.feedbackText}>👍 Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.feedbackBtn,
                          currentFeedback === false && styles.feedbackBtnActive,
                        ]}
                        onPress={() => handleFeedback(faq.id, false)}
                      >
                        <Text style={styles.feedbackText}>👎 No</Text>
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
              { backgroundColor: theme.isDark ? "#161622" : "#FFFFFF" },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="paper-plane-outline" size={20} color="#2563EB" />
                </View>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: theme.isDark ? "#FFFFFF" : "#0F172A" },
                    ]}
                  >
                    Submit Support Ticket
                  </Text>
                  <Text style={styles.modalSubtitle}>Direct report saved to developer database</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={theme.isDark ? "#FFFFFF" : "#0F172A"} />
              </TouchableOpacity>
            </View>

            {ticketSuccess ? (
              <View style={styles.successState}>
                <Ionicons name="checkmark-circle" size={54} color="#10B981" />
                <Text style={[styles.successTitle, { color: theme.isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Ticket Submitted Successfully!
                </Text>
                <Text style={styles.successDesc}>
                  Your message has been logged in our Firestore database. Our team will look into it!
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Category Picker */}
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.isDark ? "#E2E8F0" : "#334155" },
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
                            ? { backgroundColor: "#2563EB", borderColor: "#2563EB" }
                            : {
                                backgroundColor: theme.isDark ? "#202030" : "#F1F5F9",
                                borderColor: theme.isDark ? "#2D2D42" : "#E2E8F0",
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
                    { color: theme.isDark ? "#E2E8F0" : "#334155", marginTop: 14 },
                  ]}
                >
                  Your Email
                </Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: theme.isDark ? "#202030" : "#F8FAFC",
                      borderColor: theme.isDark ? "#2E2E44" : "#E2E8F0",
                      color: theme.isDark ? "#FFFFFF" : "#0F172A",
                    },
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.isDark ? "#64748B" : "#94A3B8"}
                  value={ticketEmail}
                  onChangeText={setTicketEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {/* Issue Description */}
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.isDark ? "#E2E8F0" : "#334155", marginTop: 14 },
                  ]}
                >
                  Describe the Issue
                </Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    styles.textArea,
                    {
                      backgroundColor: theme.isDark ? "#202030" : "#F8FAFC",
                      borderColor: theme.isDark ? "#2E2E44" : "#E2E8F0",
                      color: theme.isDark ? "#FFFFFF" : "#0F172A",
                    },
                  ]}
                  placeholder="What happened? Steps to reproduce or feature details..."
                  placeholderTextColor={theme.isDark ? "#64748B" : "#94A3B8"}
                  value={ticketMessage}
                  onChangeText={setTicketMessage}
                  multiline={true}
                  numberOfLines={4}
                />

                {/* Submit Action */}
                <TouchableOpacity
                  style={[
                    styles.submitTicketBtn,
                    { opacity: isSubmitting || !ticketMessage.trim() ? 0.6 : 1 },
                  ]}
                  onPress={handleSubmitTicket}
                  disabled={isSubmitting || !ticketMessage.trim()}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#FFFFFF" />
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
    gap: 12,
    marginBottom: 18,
  },
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  channelIconBoxPurple: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  channelIconBoxBlue: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  channelTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  instantPill: {
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  instantText: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
    color: "#7C3AED",
  },
  ticketPill: {
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ticketPillText: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
    color: "#2563EB",
  },
  channelDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
  },
  resultsCount: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    color: "#94A3B8",
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
    padding: 16,
  },
  faqIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  faqQuestion: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    flex: 1,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    lineHeight: 22,
    marginTop: 10,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  feedbackPrompt: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
  },
  feedbackBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
  },
  feedbackBtnActive: {
    backgroundColor: "#7C3AED",
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
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  askAiSmallBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 6,
  },
  askAiSmallText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Outfit-Medium",
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    marginBottom: 8,
  },
  ticketCategoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ticketCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
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
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  submitTicketBtn: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 22,
    gap: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  submitTicketText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  successState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    gap: 10,
  },
  successTitle: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
  },
  successDesc: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
