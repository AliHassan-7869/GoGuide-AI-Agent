import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { PolicyBody } from "../Components/PolicyModal";
import { Spacing, useTheme } from "../Components/constants/theme";

/** Full-screen Terms of Service page (replaces the old pop-up from Profile). */
export default function TermsOfServiceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScreenHeader title="Terms of Service" subtitle="Official GoGuide AI traveller agreement" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 84 }]}
        showsVerticalScrollIndicator
      >
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <PolicyBody type="terms" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.gutter },
  card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
});
