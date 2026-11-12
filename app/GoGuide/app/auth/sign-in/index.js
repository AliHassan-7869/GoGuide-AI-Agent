
import { Colors } from "@/Components/constants/constants";
import { auth } from "@/Configs/FirebaseConfig";
import PolicyModal from "../../../Components/PolicyModal";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRouter } from "expo-router";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, Linking } from "react-native";

import { TouchableOpacity } from "../../../Components/ui/Touchable";
import { AUTH_INPUT_PROPS, authInputTextStyle } from "../../../Components/constants/authInput";
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

  const [policyModal, setPolicyModal] = useState({ visible: false, type: "terms" });

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
    router.replace("/mytrip");
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

      // Successfully authenticated -> Proceed directly to app
      await proceedToApp(res);
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={clearErrors} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                {...AUTH_INPUT_PROPS}
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
                  {...AUTH_INPUT_PROPS}
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
    ...authInputTextStyle,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    fontSize: 12,
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
    fontSize: 12,
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
});
