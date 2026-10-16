import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { askTravelAssistant } from "../../Configs/AiModel";
import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import { CreateTripContext } from "../../context/CreateTripContext";

const CHAT_STORAGE_KEY = "goguide_ai_copilot_chat_v1";

const QUICK_CHIPS = [
  { label: "🍜 Best Local & Halal Food", query: "What are the top local and halal food spots I must try?" },
  { label: "🌦️ Weather & Packing Tips", query: "What is the expected weather and what essential items should I pack?" },
  { label: "💰 Budget Saver Hacks", query: "Give me 5 smart budget-saving travel hacks for this trip." },
  { label: "📍 Secret Hidden Gems", query: "What are the top secret hidden gems off the beaten tourist path?" },
  { label: "🚨 Emergency & Phrases", query: "What are the essential local emergency numbers and survival phrases?" },
  { label: "📸 Top Photo Spots", query: "Where are the best Instagrammable photography spots?" },
];

export default function AiAssistant() {
  const theme = useTheme();
  const { tripData, userData } = useContext(CreateTripContext);
  const flatListRef = useRef(null);

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
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg = {
      id: "user_" + Date.now(),
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const finalMsgs = [...updatedWithUser, aiMsg];
      setMessages(finalMsgs);
      persistMessages(finalMsgs);
    } catch (err) {
      const errorMsg = {
        id: "err_" + Date.now(),
        sender: "ai",
        text: "⚠️ Sorry, I encountered a temporary connection glitch. Please try asking again!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([...updatedWithUser, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const handleClearChat = async () => {
    const reset = [
      {
        id: "msg_reset_" + Date.now(),
        sender: "ai",
        text: initialGreeting,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setMessages(reset);
    try {
      await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (e) {}
  };

  const renderMessageItem = ({ item }) => {
    const isAi = item.sender === "ai";

    return (
      <View
        style={[
          styles.messageRow,
          isAi ? styles.messageRowAi : styles.messageRowUser,
        ]}
      >
        {isAi && (
          <View style={styles.aiAvatarBadge}>
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isAi
              ? [
                  styles.aiBubble,
                  {
                    backgroundColor: theme.isDark ? "#1E1E28" : "#FFFFFF",
                    borderColor: theme.isDark ? "#2D2D3D" : "#E2E8F0",
                  },
                ]
              : [styles.userBubble, { backgroundColor: Colors.PRIMARY || "#0F172A" }],
          ]}
        >
          {isAi && (
            <View style={styles.aiHeaderLine}>
              <Text style={styles.aiLabel}>GoGuide AI Copilot</Text>
              <View style={styles.liveModelBadge}>
                <Text style={styles.liveModelText}>Gemini 2.5</Text>
              </View>
            </View>
          )}

          <Text
            style={[
              styles.messageText,
              {
                color: isAi
                  ? theme.isDark
                    ? "#F1F5F9"
                    : "#1E293B"
                  : "#FFFFFF",
              },
            ]}
          >
            {item.text}
          </Text>

          <Text
            style={[
              styles.messageTime,
              {
                color: isAi
                  ? theme.isDark
                    ? "#64748B"
                    : "#94A3B8"
                  : "rgba(255,255,255,0.7)",
                textAlign: isAi ? "left" : "right",
              },
            ]}
          >
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeContainer,
        { backgroundColor: theme.isDark ? "#0F0F14" : "#F8FAFC" },
      ]}
    >
      {/* Header Bar */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.isDark ? "#16161F" : "#FFFFFF",
            borderBottomColor: theme.isDark ? "#222230" : "#E2E8F0",
          },
        ]}
      >
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="sparkles" size={20} color="#7C3AED" />
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.isDark ? "#FFFFFF" : "#0F172A" },
                ]}
              >
                AI Copilot
              </Text>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.isDark ? "#94A3B8" : "#64748B" },
              ]}
              numberOfLines={1}
            >
              {activeDestination
                ? `📍 Context: ${activeDestination}`
                : "🌐 Global Travel Assistant"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleClearChat}
          style={[
            styles.clearButton,
            { backgroundColor: theme.isDark ? "#222230" : "#F1F5F9" },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={theme.isDark ? "#94A3B8" : "#64748B"}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Suggestion Chips */}
      <View style={styles.chipsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_CHIPS}
          keyExtractor={(item, idx) => "chip_" + idx}
          contentContainerStyle={styles.chipsScroll}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chipButton,
                {
                  backgroundColor: theme.isDark ? "#1C1C28" : "#FFFFFF",
                  borderColor: theme.isDark ? "#2A2A3C" : "#E2E8F0",
                },
              ]}
              onPress={() => handleSend(item.query)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: theme.isDark ? "#E2E8F0" : "#334155" },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Chat Thread */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.chatListContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Typing / Loading Indicator */}
        {isLoading && (
          <View style={styles.thinkingContainer}>
            <View style={styles.aiAvatarBadgeSmall}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            </View>
            <View
              style={[
                styles.thinkingBubble,
                {
                  backgroundColor: theme.isDark ? "#1E1E28" : "#FFFFFF",
                  borderColor: theme.isDark ? "#2D2D3D" : "#E2E8F0",
                },
              ]}
            >
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text
                style={[
                  styles.thinkingText,
                  { color: theme.isDark ? "#94A3B8" : "#64748B" },
                ]}
              >
                GoGuide AI is crafting advice...
              </Text>
            </View>
          </View>
        )}

        {/* Message Input Box */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.isDark ? "#16161F" : "#FFFFFF",
              borderTopColor: theme.isDark ? "#222230" : "#E2E8F0",
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.isDark ? "#20202D" : "#F1F5F9",
                color: theme.isDark ? "#FFFFFF" : "#0F172A",
              },
            ]}
            placeholder="Ask anything about your destination..."
            placeholderTextColor={theme.isDark ? "#64748B" : "#94A3B8"}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            multiline={false}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim().length > 0 ? "#7C3AED" : theme.isDark ? "#2A2A3C" : "#E2E8F0",
              },
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            <Ionicons
              name="paper-plane"
              size={18}
              color={inputText.trim().length > 0 ? "#FFFFFF" : "#94A3B8"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(124, 58, 237, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    maxWidth: 200,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
    color: "#10B981",
  },
  clearButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsWrapper: {
    paddingVertical: 10,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 4,
    alignItems: "flex-end",
  },
  messageRowAi: {
    justifyContent: "flex-start",
    gap: 8,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  aiAvatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  aiAvatarBadgeSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  aiLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    color: "#7C3AED",
  },
  liveModelBadge: {
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  liveModelText: {
    fontSize: 9,
    color: "#7C3AED",
    fontFamily: "Outfit-Medium",
  },
  messageText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 6,
    fontFamily: "Outfit-Regular",
  },
  thinkingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thinkingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  thinkingText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 18,
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
