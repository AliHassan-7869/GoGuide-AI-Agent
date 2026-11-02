import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../Configs/FirebaseConfig";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[GoGuide ErrorBoundary caught exception]:", error, errorInfo);
    this.setState({ errorInfo });

    // Production Telemetry: Log to Firestore AppErrors collection
    try {
      const errorReport = {
        message: String(error?.message || error || "Unknown error"),
        stack: String(error?.stack || "").slice(0, 1500),
        componentStack: String(errorInfo?.componentStack || "").slice(0, 1500),
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      };
      addDoc(collection(db, "AppErrors"), errorReport).catch(() => {});
    } catch (e) {
      // Non-blocking telemetry
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      router.replace("/(tabs)/mytrip");
    } catch {
      // Fallback if router not yet mounted
    }
  };

  render() {
    if (this.state.hasError) {
      const isDark = false; // Graceful neutral dark-friendly theme
      const bg = "#0F172A";
      const cardBg = "#1E293B";
      const textColor = "#F8FAFC";
      const subtextColor = "#94A3B8";

      return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
          <StatusBar barStyle="light-content" />
          <View style={styles.contentWrap}>
            {/* Header Icon */}
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle" size={44} color="#EF4444" />
            </View>

            <Text style={[styles.title, { color: textColor }]}>
              Oops! Something went wrong
            </Text>
            <Text style={[styles.subtitle, { color: subtextColor }]}>
              GoGuide encountered an unexpected issue while rendering. Your saved trips and account data are completely safe.
            </Text>

            {/* Actions */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#0A7EA4" }]}
                onPress={this.handleReset}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: cardBg, borderColor: "#334155" }]}
                onPress={this.handleGoHome}
                activeOpacity={0.8}
              >
                <Ionicons name="home-outline" size={18} color={textColor} style={{ marginRight: 6 }} />
                <Text style={[styles.secondaryBtnText, { color: textColor }]}>Back to Hub</Text>
              </TouchableOpacity>
            </View>

            {/* Developer Trace Toggle */}
            {this.state.error && (
              <View style={styles.debugSection}>
                <TouchableOpacity
                  onPress={() =>
                    this.setState((prev) => ({ showDetails: !prev.showDetails }))
                  }
                  style={styles.detailsToggle}
                  activeOpacity={0.7}
                >
                  <Text style={styles.debugToggleText}>
                    {this.state.showDetails ? "Hide Error Trace" : "Show Developer Trace 🛠️"}
                  </Text>
                </TouchableOpacity>

                {this.state.showDetails && (
                  <ScrollView style={styles.debugBox}>
                    <Text style={styles.debugText}>
                      {this.state.error?.toString()}
                    </Text>
                    {this.state.errorInfo?.componentStack && (
                      <Text style={[styles.debugText, { marginTop: 8, opacity: 0.8 }]}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    )}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentWrap: {
    width: "88%",
    maxWidth: 420,
    alignItems: "center",
    paddingVertical: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: Platform.OS === "ios" ? "System" : "Outfit-Bold",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "System" : "Outfit-Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  btnRow: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    width: "100%",
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  debugSection: {
    marginTop: 24,
    width: "100%",
  },
  detailsToggle: {
    paddingVertical: 8,
    alignItems: "center",
  },
  debugToggleText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "500",
  },
  debugBox: {
    maxHeight: 180,
    backgroundColor: "#020617",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  debugText: {
    color: "#F87171",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});

export default ErrorBoundary;
