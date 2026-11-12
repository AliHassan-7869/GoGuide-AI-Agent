import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, FlatList, Keyboard, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { askTravelAssistant } from "../../Configs/AiModel";
import { auth } from "../../Configs/FirebaseConfig";
import { Colors } from "../../Components/constants/constants";
import { Radius, Spacing, Typography, useTheme } from "../../Components/constants/theme";
import FadeInView from "../../Components/ui/FadeInView";
import TypingIndicator from "../../Components/ui/TypingIndicator";
import { selectHaptic, tapHaptic } from "../../Components/utils/haptics";
import useReduceMotion from "../../hooks/useReduceMotion";
import { CreateTripContext } from "../../context/CreateTripContext";

import { TouchableOpacity } from "../../Components/ui/Touchable";
const CHAT_STORAGE_KEY = "goguide_ai_copilot_chat_v1";
const AI_ACCENT = "#7C3AED"; // AI feature highlight (UI_GUIDELINES)
const INPUT_MAX_HEIGHT = 112; // ~4 lines of 20px text plus padding

const nowTime = () => new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const PROMPT_CARDS = [
  { icon: "restaurant-outline", title: "Halal food in Istanbul", query: "What are the best halal food spots in Istanbul?" },
  { icon: "wallet-outline", title: "Budget tips for my trip", query: "Give me practical budget tips for my trip: daily costs, cheap eats and free things to do." },
  { icon: "partly-sunny-outline", title: "Weather & packing tips", query: "What is the expected weather and what essential items should I pack?" },
  { icon: "location-outline", title: "Hidden gems near me", query: "What are the top hidden gems near me, off the beaten tourist path?" },
];

/**
 * The Copilot helps with questions; full plans come from the trip planner (saved, mapped, budgeted).
 * When the user asks for a plan, the reply gets a "Plan this trip" button that opens the planner.
 */
const PLAN_REQUEST_RE =
  /\b(plan|itinerary|schedule|bana\s*do|banao)\b[\s\S]*\b(trip|tour|days?|din|week|weekend|itinerary|vacation|holiday)\b|\b\d+\s*-?\s*(days?|din|nights?)\b[\s\S]*\b(trip|plan|itinerary|in|to)\b|\b(plan|create|make|build|generate)\s+(a|my|me\s+a)\b[\s\S]*\b(trip|itinerary)\b/i;
const isPlanRequest = (text) => PLAN_REQUEST_RE.test(String(text || ""));

const QUICK_CHIPS = [
  { label: "🍜 Best Local & Halal Food", query: "What are the top local and halal food spots I must try?" },
  { label: "🌦️ Weather & Packing Tips", query: "What is the expected weather and what essential items should I pack?" },
  { label: "💰 Budget Saver Hacks", query: "Give me 5 smart budget-saving travel hacks for this trip." },
  { label: "📍 Secret Hidden Gems", query: "What are the top secret hidden gems off the beaten tourist path?" },
  { label: "🚨 Emergency & Phrases", query: "What are the essential local emergency numbers and survival phrases?" },
  { label: "📸 Top Photo Spots", query: "Where are the best Instagrammable photography spots?" },
];

/**
 * Clean Markdown Renderer for AI responses:
 * Eliminates raw asterisks, parses **bold**, headers, bullet items, and paragraphs.
 */
function FormattedMarkdownText({ text, isAi, theme }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <View key={lineIdx} style={{ height: 4 }} />;
        }

        const isHeader = /^#{1,4}\s+/.test(trimmed);
        const cleanLine = isHeader ? trimmed.replace(/^#{1,4}\s+/, "") : trimmed;
        const isBullet = /^(\*|-|•)\s+/.test(trimmed);
        const content = isBullet ? cleanLine.replace(/^(\*|-|•)\s+/, "") : cleanLine;

        const parts = content.split(/\*\*(.*?)\*\*/g);

        const textElements = parts.map((part, partIdx) => {
          if (!part) return null;
          const isBold = partIdx % 2 === 1;
          return (
            <Text
              key={partIdx}
              style={{
                fontFamily: isBold || isHeader ? "Outfit-Bold" : "Outfit-Regular",
                fontWeight: isBold || isHeader ? "700" : "400",
                fontSize: isHeader ? 15 : 14,
                color: isAi
                  ? (theme.isDark ? "#F1F5F9" : "#1E293B")
                  : "#FFFFFF",
                lineHeight: isHeader ? 22 : 20,
              }}
            >
              {part}
            </Text>
          );
        });

        if (isBullet) {
          return (
            <View key={lineIdx} style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginVertical: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: isAi ? (theme.isDark ? "#38BDF8" : "#0A7EA4") : "#FFFFFF",
                }}
              >
                •
              </Text>
              <Text style={{ flex: 1, lineHeight: 20 }}>{textElements}</Text>
            </View>
          );
        }

        return (
          <Text
            key={lineIdx}
            style={{
              lineHeight: isHeader ? 22 : 20,
              marginTop: isHeader ? 4 : 0,
            }}
          >
            {textElements}
          </Text>
        );
      })}
    </View>
  );
}

export default function AiAssistant() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { prompt } = useLocalSearchParams();
  const { tripData, userData } = useContext(CreateTripContext);
  const flatListRef = useRef(null);
  const handledPromptRef = useRef(null);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const safeTopPadding = Platform.select({
    android: insets.top + 4,
    ios: Math.max(insets.top, 44),
    default: 16,
  });

  const activeDestination =
    tripData?.locationInfo?.name ||
    tripData?.destination ||
    tripData?.tripPlan?.trip?.destination ||
    null;

  const initialGreeting = activeDestination
    ? `Hey ${userData?.name || "Traveler"}! ✈️ I'm your GoGuide AI Copilot. I see you're planning a trip to **${activeDestination}**!\n\nAsk me anything: local halal food, packing essentials, budget tricks, or hidden spots.`
    : `Hey ${userData?.name || "Traveler"}! 🌍 I'm your GoGuide AI Copilot.\n\nTell me where you want to travel or ask for advice on destinations, budgets, flights, and hidden gems!`;

  const [messages, setMessages] = useState([
    {
      id: "msg_init",
      sender: "ai",
      text: initialGreeting,
      time: nowTime(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const reduceMotion = useReduceMotion();
  const listFade = useMemo(() => new Animated.Value(1), []);

  // Load chat history from storage if available
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.warn("Could not load AI chat history:", e);
      }
    })();
  }, []);

  // Save chat history
  const persistMessages = async (newMsgs) => {
    try {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(newMsgs.slice(-20)));
    } catch (e) {
      console.warn("Could not save AI chat history:", e);
    }
  };

  const handleSend = async (customText = null) => {
    const textToSend = (typeof customText === "string" ? customText : inputText).trim();
    if (!textToSend || isLoading) return;
    tapHaptic();

    if (!auth?.currentUser) {
      try {
        const { signInAnonymously } = await import("firebase/auth");
        await signInAnonymously(auth);
      } catch (authErr) {
        console.warn("Auto-signin notice:", authErr);
      }
    }

    const userMsg = {
      id: "user_" + Date.now(),
      sender: "user",
      text: textToSend,
      time: nowTime(),
    };

    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    setInputText("");
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const activeTrip = {
        destination: activeDestination,
        days: tripData?.totalDays || tripData?.days,
        budget: tripData?.budget,
      };

      const aiReplyText = await askTravelAssistant(textToSend, updatedWithUser, activeTrip);

      const aiMsg = {
        id: "ai_" + Date.now(),
        sender: "ai",
        text: aiReplyText,
        time: nowTime(),
        showPlanCta: isPlanRequest(textToSend),
      };

      const finalMsgs = [...updatedWithUser, aiMsg];
      setMessages(finalMsgs);
      persistMessages(finalMsgs);
    } catch (err) {
      const errorMsg = {
        id: "err_" + Date.now(),
        sender: "ai",
        text: "⚠️ Sorry, I encountered a temporary connection glitch. Please try asking again!",
        time: nowTime(),
      };
      setMessages([...updatedWithUser, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  // Handle incoming prompt from recommendations or other screens
  useEffect(() => {
    if (prompt && handledPromptRef.current !== prompt) {
      handledPromptRef.current = prompt;
      setTimeout(() => {
        handleSend(String(prompt));
      }, 500);
    }
  }, [prompt]);

  const hasUserMessages = messages.some((m) => m.sender === "user");
  const canClear = hasUserMessages && !isLoading;

  const performClear = () => {
    const reset = [
      { id: "msg_reset_" + Date.now(), sender: "ai", text: initialGreeting, time: nowTime() },
    ];
    const apply = () => {
      setMessages(reset);
      setInputText("");
      AsyncStorage.removeItem(CHAT_STORAGE_KEY).catch(() => {});
      if (reduceMotion) {
        listFade.setValue(1);
      } else {
        Animated.timing(listFade, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== "web" }).start();
      }
    };
    if (reduceMotion) {
      apply();
    } else {
      Animated.timing(listFade, { toValue: 0, duration: 160, useNativeDriver: Platform.OS !== "web" }).start(apply);
    }
  };

  const handleClearChat = () => {
    if (!canClear) return;
    tapHaptic();
    if (Platform.OS === "web") {
      const ok = typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm("Clear this conversation?") : true;
      if (ok) performClear();
      return;
    }
    Alert.alert("Clear this conversation?", "This removes all messages from this chat.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: performClear },
    ]);
  };

  const renderMessageItem = ({ item }) => {
    const isAi = item.sender === "ai";

    return (
      <FadeInView style={[styles.messageRow, isAi ? styles.messageRowAi : styles.messageRowUser]}>
        {isAi && (
          <View style={styles.aiAvatarBadge} accessibilityElementsHidden importantForAccessibility="no">
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isAi
              ? [styles.aiBubble, { backgroundColor: theme.card, borderColor: theme.border }]
              : [styles.userBubble, { backgroundColor: Colors.PRIMARY || theme.primary }],
          ]}
        >
          {isAi && (
            <View style={styles.aiHeaderLine}>
              <Text style={styles.aiLabel} maxFontSizeMultiplier={1.3}>GoGuide AI Copilot</Text>
              <View style={styles.liveModelBadge}>
                <Text style={styles.liveModelText} maxFontSizeMultiplier={1.3}>AI</Text>
              </View>
            </View>
          )}

          {/* Markdown-parsed message body without raw asterisks */}
          <FormattedMarkdownText text={item.text} isAi={isAi} theme={theme} />

          {isAi && item.showPlanCta ? (
            <TouchableOpacity
              onPress={() => router.push("/create-trip/search-place")}
              accessibilityRole="button"
              accessibilityLabel="Plan this trip with the trip planner"
              style={[styles.planCtaBtn, { backgroundColor: Colors.PRIMARY }]}
            >
              <Ionicons name="map-outline" size={16} color="#FFFFFF" />
              <Text style={styles.planCtaText} maxFontSizeMultiplier={1.3}>Plan this trip</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}

          <Text
            maxFontSizeMultiplier={1.3}
            style={[
              styles.messageTime,
              { color: isAi ? theme.subtext : "rgba(255,255,255,0.8)", textAlign: isAi ? "left" : "right" },
            ]}
          >
            {item.time}
          </Text>
        </View>
      </FadeInView>
    );
  };

  const canSend = inputText.trim().length > 0 && !isLoading;

  const renderFooter = () => (
    <View>
      {isLoading ? (
        <View style={[styles.messageRow, styles.messageRowAi, { marginTop: Spacing.sm }]}>
          <View style={styles.aiAvatarBadge} accessibilityElementsHidden importantForAccessibility="no">
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          </View>
          <TypingIndicator theme={theme} />
        </View>
      ) : null}
      {!hasUserMessages && !isLoading ? (
        <View style={styles.welcomeWrap}>
          <Text style={[styles.welcomeTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
            Try asking
          </Text>
          <View style={styles.cardGrid}>
            {PROMPT_CARDS.map((card, idx) => (
              <FadeInView key={card.title} index={idx} style={styles.promptCardCell}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={card.title}
                  onPress={() => handleSend(card.query)}
                  style={[styles.promptCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={styles.promptIcon}>
                    <Ionicons name={card.icon} size={20} color={AI_ACCENT} />
                  </View>
                  <Text style={[styles.promptTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                    {card.title}
                  </Text>
                </TouchableOpacity>
              </FadeInView>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.safeContainer, { backgroundColor: theme.bg, paddingTop: safeTopPadding }]}>
      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="sparkles" size={20} color={AI_ACCENT} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.headerTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
                AI Copilot
              </Text>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText} maxFontSizeMultiplier={1.3}>Active</Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {activeDestination ? `📍 Context: ${activeDestination}` : "🌐 Global Travel Assistant"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Clear conversation"
          accessibilityState={{ disabled: !canClear }}
          onPress={handleClearChat}
          disabled={!canClear}
          style={[styles.clearButton, { backgroundColor: theme.badgeBg, borderColor: theme.border, opacity: canClear ? 1 : 0.4 }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.clearButtonText, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Suggestion Chips (shown once a conversation has started; before that the prompt cards do the job) */}
      {hasUserMessages ? (
        <View style={styles.chipsWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            data={QUICK_CHIPS}
            keyExtractor={(item, idx) => "chip_" + idx}
            contentContainerStyle={styles.chipsScroll}
            renderItem={({ item }) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ disabled: isLoading }}
                disabled={isLoading}
                style={[styles.chipButton, { backgroundColor: theme.card, borderColor: theme.border, opacity: isLoading ? 0.5 : 1 }]}
                onPress={() => handleSend(item.query)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {/* Chat Thread with Pinned Keyboard Avoiding View (WhatsApp-style Flush Docking) */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 50 : 0}
      >
        <Animated.View style={{ flex: 1, opacity: listFade }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            ListFooterComponent={renderFooter}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatListContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </Animated.View>

        {/* Message Input Box: Flush against virtual keyboard when open, respecting safe area when closed */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.bg, color: theme.inputText }]}
            placeholder="Ask about your trip..."
            placeholderTextColor={theme.subtext}
            value={inputText}
            onChangeText={setInputText}
            multiline
            scrollEnabled
            maxFontSizeMultiplier={1.3}
            accessibilityLabel="Message input"
            textAlignVertical="center"
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            style={[styles.sendButton, { backgroundColor: canSend ? AI_ACCENT : theme.border, opacity: canSend ? 1 : 0.6 }]}
            onPress={() => {
              selectHaptic();
              handleSend();
            }}
            disabled={!canSend}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane" size={18} color={canSend ? "#FFFFFF" : theme.subtext} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: Spacing.md, flexShrink: 1 },
  headerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: "rgba(124, 58, 237, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: Typography.sizeLg, fontFamily: Typography.fontBold },
  headerSubtitle: { fontSize: Typography.sizeSm, fontFamily: Typography.fontRegular, marginTop: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  statusText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium, color: "#10B981" },
  clearButton: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  chipsWrapper: { paddingVertical: 10 },
  chipsScroll: { paddingHorizontal: 16, gap: Spacing.sm },
  chipButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },
  chatListContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: 14 },
  messageRow: { flexDirection: "row", marginVertical: 4, alignItems: "flex-end" },
  messageRowAi: { justifyContent: "flex-start", gap: Spacing.sm },
  messageRowUser: { justifyContent: "flex-end" },
  aiAvatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AI_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.card },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: { borderBottomRightRadius: 4 },
  aiHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: Spacing.sm,
  },
  aiLabel: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, color: AI_ACCENT },
  liveModelBadge: {
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  liveModelText: { fontSize: Typography.sizeSm, color: AI_ACCENT, fontFamily: Typography.fontMedium },
  planCtaBtn: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  planCtaText: { color: "#FFFFFF", fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  messageTime: { fontSize: Typography.sizeSm, marginTop: 6, fontFamily: Typography.fontRegular },
  welcomeWrap: { marginTop: Spacing.lg },
  welcomeTitle: { fontSize: Typography.sizeBase, fontFamily: Typography.fontBold, marginBottom: Spacing.md },
  cardGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  promptCardCell: { flexGrow: 1, flexBasis: "45%" },
  promptCard: {
    minHeight: 84,
    padding: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  promptIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "rgba(124, 58, 237, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  promptTitle: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: INPUT_MAX_HEIGHT,
    borderRadius: 23,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 12 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    fontSize: Typography.sizeMd,
    lineHeight: 20,
    fontFamily: Typography.fontRegular,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
});
