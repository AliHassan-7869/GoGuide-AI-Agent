import { Stack, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../Components/constants/theme";
import EmptyState from "../Components/ui/EmptyState";
import ScreenHeader from "../Components/ui/ScreenHeader";

export default function NotFoundScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Page Not Found"
        subtitle="We couldn't find that screen"
        onBack={() => router.replace("/(tabs)/mytrip")}
      />
      <View style={styles.body}>
        <EmptyState
          icon="compass-outline"
          title="This route doesn't exist"
          text="The link may be outdated or moved. Return to My Trips to keep planning your journey."
          actionLabel="Go to My Trips"
          onAction={() => router.replace("/(tabs)/mytrip")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
});
