import { Colors } from "@/Components/constants/constants";
import { auth } from "@/Configs/FirebaseConfig";
import { send2FaOtp, verify2FaOtp } from "@/Configs/AiModel";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRouter } from "expo-router";
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";

export default function SignIn() {
  const navigation = useNavigation();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [errorField, setErrorField] = useState(null); // "email" | "password" | "both" | null

  // 2FA state
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [pendingUser, setPendingUser] = useState(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
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

  const proceedToApp = async (res) => {
    await AsyncStorage.setItem("loginUserData", JSON.stringify(res));
    setShow2FaModal(false);
    router.replace("/mytrip");
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      setOtpError("Please enter the complete 6-digit code");
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      await verify2FaOtp(email.trim(), otpCode.trim());
      await proceedToApp(pendingUser);
    } catch (err) {
      setOtpError(err.message || "Invalid or expired verification code");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpLoading(true);
    setOtpError("");
    try {
      await send2FaOtp(email.trim());
      Alert.alert("Code Sent ✉️", "A new 6-digit verification code has been sent to " + email.trim());
    } catch (err) {
      setOtpError(err.message || "Failed to resend code");
    } finally {
      setOtpLoading(false);
    }
  };

  const cancel2Fa = async () => {
    setShow2FaModal(false);
    setPendingUser(null);
    setOtpCode("");
    setOtpError("");
    try {
      await signOut(auth);
    } catch (e) {}
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
      const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
      console.log("User signed in:", res);

      // 1. Check if 2FA is enabled
      const is2Fa = await AsyncStorage.getItem(`@goguide_2fa_enabled_${cleanEmail.toLowerCase()}`);
      if (is2Fa === "true") {
        setPendingUser(res);
        setShow2FaModal(true);
        setOtpError("");
        setOtpCode("");
        try {
          await send2FaOtp(cleanEmail);
        } catch (otpErr) {
          setOtpError(otpErr.message || "Error sending code");
        }
        setLoading(false);
        return;
      }

      // 2. Email verification warning if not verified
      if (res.user && !res.user.emailVerified) {
        Alert.alert(
          "Email Not Verified ✉️",
          "Your email address is not verified yet. Would you like us to resend the verification link?",
          [
            { text: "Continue Anyway", onPress: () => proceedToApp(res) },
            {
              text: "Resend Link",
              onPress: async () => {
                try {
                  await sendEmailVerification(res.user);
                  Alert.alert("Verification Sent", "Check your inbox for the verification link.");
                } catch (e) {}
                proceedToApp(res);
              },
            },
          ]
        );
      } else {
        await proceedToApp(res);
      }
    } catch (error) {
      console.log("Sign in error:", error.code, error.message);
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

  const clearErrors = () => {
    if (errorMessage) {
      setErrorMessage("");
      setErrorTitle("");
      setErrorField(null);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back 👋</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>

            {/* Prominent Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={22} color="#DC2626" style={{ marginRight: 10, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>{errorTitle || "Wrong Credentials"}</Text>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
                <TouchableOpacity onPress={clearErrors} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color="#991B1B" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  (errorField === "email" || errorField === "both") && styles.inputError,
                ]}
                placeholder="Enter your email"
                placeholderTextColor={Colors.GRAY}
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
              <Text style={styles.label}>Password</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={[
                    styles.input,
                    (errorField === "password" || errorField === "both") && styles.inputError,
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.GRAY}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    clearErrors();
                  }}
                />
                <TouchableOpacity
                  style={{ position: "absolute", right: 16, top: 14 }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color={Colors.GRAY}
                  />
                </TouchableOpacity>
              </View>
              {(errorField === "password" || errorField === "both") && (
                <Text style={styles.fieldErrorHint}>Please check your password</Text>
              )}
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, isDisabled && styles.disabledBtn]}
              onPress={handleSignIn}
              disabled={isDisabled}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            {/* Terms of Service & Privacy Legal Disclaimer */}
            <Text style={styles.legalDisclaimer}>
              By signing in, you agree to GoGuide's{" "}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL("https://dist-seven-tau-79.vercel.app/terms")}
              >
                Terms of Service
              </Text>{" "}
              &{" "}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL("https://dist-seven-tau-79.vercel.app/privacy")}
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

      {/* 2FA Verification Modal */}
      <Modal
        visible={show2FaModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancel2Fa}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalCard}>
            <View style={styles.otpIconWrap}>
              <Ionicons name="shield-checkmark" size={32} color="#0D9488" />
            </View>
            <Text style={styles.otpModalTitle}>Security Verification</Text>
            <Text style={styles.otpModalSubtitle}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={{ fontWeight: "700", color: "#0F172A" }}>{email.trim()}</Text>
            </Text>

            {otpError ? (
              <View style={styles.otpErrorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.otpErrorText}>{otpError}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.otpInput}
              value={otpCode}
              onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="------"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={true}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.otpVerifyBtn, otpCode.length !== 6 && { opacity: 0.6 }]}
              onPress={handleVerifyOtp}
              disabled={otpLoading || otpCode.length !== 6}
              activeOpacity={0.8}
            >
              {otpLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.otpVerifyBtnText}>Verify & Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.otpFooter}>
              <TouchableOpacity onPress={handleResendOtp} disabled={otpLoading}>
                <Text style={styles.otpResendText}>Resend Code</Text>
              </TouchableOpacity>
              <Text style={{ color: "#CBD5E1" }}>|</Text>
              <TouchableOpacity onPress={cancel2Fa} disabled={otpLoading}>
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    shadowColor: "#000",
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
    color: "#DC2626",
    marginBottom: 2,
  },
  errorText: {
    fontFamily: "Outfit-Regular",
    fontSize: 12,
    color: "#991B1B",
    lineHeight: 17,
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
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    fontFamily: "Outfit-Regular",
    fontSize: 15,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF5F5",
    borderWidth: 1.5,
  },
  fieldErrorHint: {
    fontFamily: "Outfit-Regular",
    fontSize: 11,
    color: "#DC2626",
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
    color: "#fff",
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
  legalDisclaimer: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    color: "#64748B",
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
  otpModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  otpIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  otpModalTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 20,
    color: "#0F172A",
    marginBottom: 6,
  },
  otpModalSubtitle: {
    fontFamily: "Outfit-Regular",
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  otpErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  otpErrorText: {
    fontFamily: "Outfit-Regular",
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
  },
  otpInput: {
    width: "100%",
    letterSpacing: 12,
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 18,
  },
  otpVerifyBtn: {
    width: "100%",
    backgroundColor: "#0D9488",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  otpVerifyBtnText: {
    fontFamily: "Outfit-Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  otpFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  otpResendText: {
    fontFamily: "Outfit-Medium",
    fontSize: 13,
    color: "#0D9488",
  },
  otpCancelText: {
    fontFamily: "Outfit-Regular",
    fontSize: 13,
    color: "#94A3B8",
  },
});
