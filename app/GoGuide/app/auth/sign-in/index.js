
import { Colors } from "@/Components/constants/constants";
import { auth } from "@/Configs/FirebaseConfig";
import PolicyModal from "../../../Components/PolicyModal";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRouter } from "expo-router";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { useContext, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TouchableOpacity } from "../../../Components/ui/Touchable";
import { getAuthInputProps, getAuthInputStyle } from "../../../Components/constants/authInput";
import { Palette, Radius, Spacing, Typography, useTheme } from "../../../Components/constants/theme";
import { purgeLegacyLoginData } from "../../../Components/utils/legacyLoginCleanup";
import { resetOutcome, validateResetEmail } from "../../../Components/utils/passwordReset";
import { continueAsGuest } from "../../../Components/utils/AccountLinkingService";
import { CreateTripContext } from "../../../context/CreateTripContext";
export default function SignIn() {
  const navigation = useNavigation();
  const router = useRouter();
  const theme = useTheme();
  const { setEntitlements } = useContext(CreateTripContext) || {};

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [errorField, setErrorField] = useState(null); // "email" | "password" | "both" | null
  const [infoMessage, setInfoMessage] = useState("");
  const [resetting, setResetting] = useState(false);

  const [policyModal, setPolicyModal] = useState({ visible: false, type: "terms" });

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs on mount only / depends on stable references; adding the flagged dependency would re-run it on every render
  }, []);

  const isDisabled = !email || !password || loading;

  const parseAuthError = (code, msg) => {
    switch (code) {
      case "auth/wrong-password":
        return {
          title: "Wrong Password ❌",
          message: "The password you entered is incorrect. Please check your password and try again.",
          field: "password",
        };
      case "auth/user-not-found":
        return {
          title: "Wrong Email Address ❌",
          message: "No account exists with this email address. Please check your email or create a new account.",
          field: "email",
        };
      case "auth/invalid-credential":
        return {
          title: "Wrong Email or Password ❌",
          message: "The email address or password you entered is incorrect. Please verify your credentials and try again.",
          field: "both",
        };
      case "auth/invalid-email":
        return {
          title: "Invalid Email Address ❌",
          message: "The email address format is not valid. Please enter a valid email (e.g. name@example.com).",
          field: "email",
        };
      case "auth/user-disabled":
        return {
          title: "Account Disabled ❌",
          message: "This account has been disabled. Please contact GoGuide support.",
          field: "both",
        };
      case "auth/too-many-requests":
        return {
          title: "Too Many Attempts ⏳",
          message: "Access temporarily disabled due to many failed login attempts. Please wait a moment or reset your password.",
          field: "both",
        };
      case "auth/network-request-failed":
        return {
          title: "Network Error 📡",
          message: "Unable to connect to the authentication server. Please check your internet connection.",
          field: "both",
        };
      default:
        const lower = (msg || "").toLowerCase();
        if (lower.includes("password")) {
          return {
            title: "Wrong Password ❌",
            message: "The password you entered is incorrect. Please verify and try again.",
            field: "password",
          };
        }
        if (lower.includes("email") || lower.includes("user")) {
          return {
            title: "Wrong Email Address ❌",
            message: "No registered account found with this email. Please check your email.",
            field: "email",
          };
        }
        return {
          title: "Sign In Failed ❌",
          message: "Wrong email address or password. Please verify your credentials and try again.",
          field: "both",
        };
    }
  };

  const proceedToApp = async () => {
    // Firebase Auth keeps the session itself. Never copy the credential into app storage.
    await purgeLegacyLoginData(AsyncStorage);
    router.replace("/mytrip");
  };

  const handleGuestSignIn = async () => {
    if (guestLoading || loading) return;
    setErrorMessage("");
    setErrorTitle("");
    setErrorField(null);
    setGuestLoading(true);
    try {
      const { entitlements } = await continueAsGuest();
      if (entitlements) setEntitlements?.(entitlements);
      await purgeLegacyLoginData(AsyncStorage);
      router.replace("/(tabs)/discover");
    } catch (error) {
      __DEV__ && console.log("Guest sign-in error:", error?.code, error?.message);
      setErrorTitle("Guest Sign-In Unavailable");
      setErrorMessage(error?.message || "Could not start a guest session right now. Please try again.");
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSignIn = async () => {
    setErrorMessage("");
    setErrorTitle("");
    setErrorField(null);

    const cleanEmail = email.trim();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorTitle("Invalid Email Format ❌");
      setErrorMessage("Please enter a valid email address (e.g. name@example.com).");
      setErrorField("email");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, cleanEmail, password);

      // Successfully authenticated -> Proceed directly to app
      await proceedToApp();
    } catch (error) {
      __DEV__ && console.log("Sign in error:", error.code, error.message);
      const parsed = parseAuthError(error.code, error.message);
      setErrorTitle(parsed.title);
      setErrorMessage(parsed.message);
      setErrorField(parsed.field);

      if (Platform.OS !== "web") {
        Alert.alert(parsed.title, parsed.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage("");
    setErrorTitle("");
    setErrorField(null);
    setInfoMessage("");

    const check = validateResetEmail(email);
    if (!check.ok) {
      setErrorTitle("Reset Password");
      setErrorMessage(check.message);
      setErrorField("email");
      return;
    }

    setResetting(true);
    let failure = null;
    try {
      await sendPasswordResetEmail(auth, check.email);
    } catch (error) {
      failure = error;
    } finally {
      setResetting(false);
    }

    const outcome = resetOutcome(failure);
    if (outcome.sent) {
      setInfoMessage(outcome.message);
    } else {
      setErrorTitle("Couldn't Send Reset Email");
      setErrorMessage(outcome.message);
    }
  };

  const clearErrors = () => {
    if (infoMessage) setInfoMessage("");
    if (errorMessage) {
      setErrorMessage("");
      setErrorTitle("");
      setErrorField(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: theme.isDark ? 1 : 0 }]}>
            <Text style={[styles.title, { color: theme.text }]}>Sign In</Text>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>Sign in to plan, save and sync your trips</Text>

            {/* Prominent Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={22} color={Palette.dangerDark} style={{ marginRight: 10, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>{errorTitle || "Wrong Credentials"}</Text>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={clearErrors} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color={Palette.dangerDark} />
                </TouchableOpacity>
              </View>
            ) : null}

            {infoMessage ? (
              <View style={styles.infoBanner} accessibilityLiveRegion="polite">
                <Ionicons name="checkmark-circle" size={22} color={Palette.successDark} style={{ marginRight: 10, marginTop: 1 }} />
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.inputWrap}>
              <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  getAuthInputStyle(theme),
                  (errorField === "email" || errorField === "both") && [
                    styles.inputError,
                    { backgroundColor: theme.isDark ? "rgba(239, 68, 68, 0.14)" : "#FFF5F5" },
                  ],
                ]}
                placeholder="Enter your email"
                {...getAuthInputProps(theme)}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  clearErrors();
                }}
              />
              {(errorField === "email" || errorField === "both") && (
                <Text style={styles.fieldErrorHint}>Please check your email address</Text>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputWrap}>
              <Text style={[styles.label, { color: theme.text }]}>Password</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={[
                    styles.input,
                    getAuthInputStyle(theme),
                    { paddingRight: 48 },
                    (errorField === "password" || errorField === "both") && [
                      styles.inputError,
                      { backgroundColor: theme.isDark ? "rgba(239, 68, 68, 0.14)" : "#FFF5F5" },
                    ],
                  ]}
                  placeholder="Enter your password"
                  {...getAuthInputProps(theme)}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    clearErrors();
                  }}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 16, top: 14 }}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={theme.subtext}
                  />
                </TouchableOpacity>
              </View>
              {(errorField === "password" || errorField === "both") && (
                <Text style={styles.fieldErrorHint}>Please check your password</Text>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Forgot password? Send a reset link to the email above"
                style={styles.forgotBtn}
                onPress={handleForgotPassword}
                disabled={resetting || loading}
              >
                <Text style={styles.forgotText}>{resetting ? "Sending reset link..." : "Forgot password?"}</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                isDisabled && [
                  styles.disabledBtn,
                  { backgroundColor: theme.isDark ? Palette.slate700 : Palette.slate300 },
                ],
              ]}
              onPress={handleSignIn}
              disabled={isDisabled}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.primaryText,
                  isDisabled && { color: theme.isDark ? Palette.slate400 : Palette.slate600 },
                ]}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            {/* Continue as Guest (2 Free Trips) */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue as Guest (2 Free Trips)"
              style={[
                styles.guestBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.isDark ? "rgba(255,255,255,0.04)" : theme.bg,
                },
              ]}
              onPress={handleGuestSignIn}
              disabled={guestLoading || loading}
              activeOpacity={0.85}
            >
              {guestLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={18} color={theme.primary} style={{ marginRight: Spacing.sm }} />
                  <Text style={[styles.guestText, { color: theme.text }]}>
                    Continue as Guest (2 Free Trips)
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Terms of Service & Privacy Legal Disclaimer */}
            <Text style={styles.legalDisclaimer}>
              By signing in, you agree to GoGuide&apos;s{" "}
              <Text
                style={styles.legalLink}
                onPress={() => setPolicyModal({ visible: true, type: "terms" })}
              >
                Terms of Service
              </Text>{" "}
              &amp;{" "}
              <Text
                style={styles.legalLink}
                onPress={() => setPolicyModal({ visible: true, type: "privacy" })}
              >
                Privacy Policy
              </Text>
            </Text>

            {/* Sign Up */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace("auth/sign-up")}
            >
              <Text style={styles.secondaryText}>
                Don’t have an account? Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

          {/* Same-page Policy / Terms Modal */}
      <PolicyModal
        visible={policyModal.visible}
        type={policyModal.type}
        onClose={() => setPolicyModal({ visible: false, type: "terms" })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: Colors.WHITE,
    borderRadius: 24,
    padding: 25,
    shadowColor: Palette.black,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontFamily: "Outfit-Bold",
    fontSize: 32,
    color: Colors.PRIMARY,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Outfit-Regular",
    fontSize: 15,
    color: Colors.GRAY,
    textAlign: "center",
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  errorTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 13,
    color: Palette.dangerDark,
    marginBottom: 2,
  },
  errorText: {
    fontFamily: "Outfit-Regular",
    fontSize: 12,
    color: Palette.dangerDark,
    lineHeight: 17,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Palette.greenPale,
    borderColor: Palette.success,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontFamily: "Outfit-Regular",
    fontSize: 13,
    color: Palette.successDark,
    lineHeight: 18,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  forgotText: {
    fontFamily: "Outfit-Bold",
    fontSize: 14,
    color: Colors.PRIMARY,
  },
  inputWrap: {
    marginBottom: 18,
  },
  label: {
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    color: Colors.GRAY,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Palette.gray200,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    fontFamily: "Outfit-Regular",
    fontSize: 15,
  },
  inputError: {
    borderColor: Palette.danger,
    borderWidth: 1.5,
  },
  fieldErrorHint: {
    fontFamily: "Outfit-Regular",
    fontSize: 12,
    color: Palette.dangerDark,
    marginTop: 4,
    marginLeft: 4,
  },
  primaryBtn: {
    marginTop: 26,
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
    shadowColor: Colors.PRIMARY,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    elevation: 8,
  },
  primaryText: {
    color: Palette.white,
    fontFamily: "Outfit-Bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  disabledBtn: {
    backgroundColor: "#C7C7C7",
    shadowOpacity: 0,
  },
  secondaryBtn: {
    marginTop: 22,
  },
  secondaryText: {
    textAlign: "center",
    color: Colors.PRIMARY,
    fontFamily: "Outfit-Bold",
    fontSize: 14,
  },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  guestText: {
    fontFamily: Typography.fontSemiBold,
    fontSize: Typography.sizeMd,
  },
  legalDisclaimer: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    color: Palette.slate500,
    marginTop: 14,
    marginBottom: 4,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  legalLink: {
    color: Colors.PRIMARY,
    fontFamily: "Outfit-Bold",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
});
