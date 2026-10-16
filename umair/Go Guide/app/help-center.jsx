import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Colors } from "../Components/constants/constants";
import { useTheme } from "../Components/constants/theme";

export default function HelpCenter() {
  const router = useRouter();
  const theme = useTheme();

  const faqs = [
    {
      question: "How does the AI Trip Planner work?",
      answer:
        "Our AI model takes your location, destination, budget, and interests to generate a highly personalized, day-by-day travel itinerary using the latest Gemini technology.",
    },
    {
      question: "Can I save my trip offline?",
      answer:
        "Currently, your trips require an internet connection to generate and view. Offline saving is a feature coming in a future update!",
    },
    {
      question: "How do I edit my profile?",
      answer:
        "Navigate to the Profile tab using the bottom navigation bar, and select 'Edit Profile' to change your name, email, and avatar.",
    },
    {
      question: "Are the estimated budgets accurate?",
      answer:
        "The budgets provided are rough estimates based on general travel data. Costs for flights and hotels change daily, so please verify prices using the provided links.",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.isDark ? theme.icon : Colors.PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.isDark ? theme.text : Colors.PRIMARY }]}>
          Help Center
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.contactSection, { backgroundColor: theme.card }]}>
          <Ionicons name="chatbubbles-outline" size={40} color={Colors.PRIMARY} />
          <Text style={[styles.contactTitle, { color: theme.text }]}>Need more help?</Text>
          <Text style={[styles.contactSubtitle, { color: theme.subtext }]}>
            Our support team is available 24/7 to assist you.
          </Text>
          <TouchableOpacity style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>

        {faqs.map((faq, index) => (
          <View key={index} style={[styles.faqCard, { backgroundColor: theme.card }]}>
            <View style={styles.faqHeader}>
              <Ionicons name="help-circle-outline" size={20} color={Colors.PRIMARY} />
              <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.question}</Text>
            </View>
            <Text style={[styles.faqAnswer, { color: theme.subtext }]}>{faq.answer}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    paddingBottom: 15,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contactSection: {
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    marginTop: 15,
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  contactBtn: {
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  contactBtnText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    marginBottom: 15,
  },
  faqCard: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  faqQuestion: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    marginLeft: 10,
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    lineHeight: 22,
    marginLeft: 30,
  },
});
