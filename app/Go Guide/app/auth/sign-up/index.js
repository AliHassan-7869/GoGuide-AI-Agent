import { Colors } from "@/Components/constants/constants";
import PolicyModal from "@/Components/PolicyModal";
import { auth } from "@/Configs/FirebaseConfig";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Linking,
} from "react-native";

export default function Signup() {
  const navigation = useNavigation();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyModal, setPolicyModal] = useState({ visible: false, type: "terms" });
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [errorField, setErrorField] = useState(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const isDisabled = !fullName || !email || !password || !termsAccepted || loading;

  const parseSignUpError = (code, msg) => {
    const lower = (msg || "").toLowerCase();
    if (code === "auth/email-already-in-use" || lower.includes("already in use") || lower.includes("already-in-use") || lower.includes("already exists")) {
      return {
        title: "Email Already In Use ❌",
        message: "This email address is already registered. You cannot create another account with this email. Please use a new email address or sign in.",
        field: "email",
        isAlreadyRegistered: true,
      };
    }

    switch (code) {
      case "auth/invalid-email":
        return {
          title: "Invalid Email Address ❌",
          message: "The email address format is invalid. Please enter a valid email.",
          field: "email",
        };
      case "auth/weak-password":
        return {
          title: "Password Too Weak ❌",
          message: "The password should be at least 6 characters long.",
          field: "password",
        };
      case "auth/network-request-failed":
        return {
          title: "Network Error 📡",
          message: "Unable to reach authentication server. Please check your internet connection.",
          field: "both",
        };
      default:
        return {
          title: "Account Creation Failed ❌",
          message: msg || "Unable to create account. Please check your information and try again.",
          field: "both",
        };
    }
  };

  const clearErrors = () => {
    if (errorMessage) {
      setErrorMessage("");
      setErrorTitle("");
      setErrorField(null);
    }
  };

  const handleCreateAccount = async () => {
    clearErrors();

    const cleanEmail = email.trim();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorTitle("Invalid Email Format ❌");
      setErrorMessage("Please enter a valid email address (e.g. name@example.com).");
      setErrorField("email");
      return;
    }

    if (password.length < 6) {
      setErrorTitle("Password Too Short ❌");
      setErrorMessage("Password must be at least 6 characters long.");
      setErrorField("password");
      return;
    }

    // Instant local check for already registered emails on this device
    try {
      const cachedEmailsRaw = await AsyncStorage.getItem("@goguide_registered_emails");
      if (cachedEmailsRaw) {
        const cachedEmails = JSON.parse(cachedEmailsRaw);
        if (Array.isArray(cachedEmails) && cachedEmails.includes(cleanEmail.toLowerCase())) {
          setErrorTitle("Email Already In Use ❌");
          setErrorMessage("This email is already registered on this device. You cannot create another account with this email. Please enter a new email address or sign in.");
          setErrorField("email");
          return;
        }
      }
    } catch (e) {}

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password,
      );

      await updateProfile(userCredential.user, {
        displayName: fullName.trim(),
      });

      // Cache this email so duplicate registration attempts are instantly recognized
      try {
        const cachedEmailsRaw = await AsyncStorage.getItem("@goguide_registered_emails");
        const list = cachedEmailsRaw ? JSON.parse(cachedEmailsRaw) : [];
        if (!list.includes(cleanEmail.toLowerCase())) {
          list.push(cleanEmail.toLowerCase());
          await AsyncStorage.setItem("@goguide_registered_emails", JSON.stringify(list));
        }
      } catch (e) {}

      // Send official Firebase Email Verification link
      try {
        await sendEmailVerification(userCredential.user);
      } catch (emailErr) {
        console.log("Email verification notice:", emailErr.message);
      }

      Alert.alert(
        "Account Created 🎉",
        "A verification email has been sent to " + cleanEmail + ". Please verify your email to unlock all AI travel planning features.",
        [{ text: "Sign In", onPress: () => router.replace("auth/sign-in") }]
      );
      router.replace("auth/sign-in");
    } catch (error) {
      console.log("Sign up error:", error.code, error.message);
      const parsed = parseSignUpError(error.code, error.message);
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color={Colors.PRIMARY} />
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your journey with Guide Go</Text>

        {/* Prominent Error Banner */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={22} color="#DC2626" style={{ marginRight: 10, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>{errorTitle || "Registration Notice"}</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {errorMessage?.toLowerCase().includes("already") && (
                <TouchableOpacity
                  style={styles.signInShortcutBtn}
                  onPress={() => router.replace("auth/sign-in")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signInShortcutText}>Sign In With Existing Email ➔</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={clearErrors} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color="#991B1B" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Full Name */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="name"
            placeholderTextColor={Colors.GRAY}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        {/* Email */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[
              styles.input,
              (errorField === "email" || errorField === "both") && styles.inputError,
            ]}
            placeholder="example@email.com"
            placeholderTextColor={Colors.GRAY}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              clearErrors();
            }}
          />
          {(errorField === "email" || errorField === "both") && (
            <Text style={styles.fieldErrorHint}>
              {errorMessage?.toLowerCase().includes("already")
                ? "This email is already in use. Please enter a new email."
                : "Please check your email address."}
            </Text>
          )}
        </View>

        {/* Password */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordWrap}>
            <TextInput
              style={[
                styles.input,
                (errorField === "password" || errorField === "both") && styles.inputError,
              ]}
              placeholder="Create a password"
              placeholderTextColor={Colors.GRAY}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clearErrors();
              }}
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eye}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={22}
                color={Colors.GRAY}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Terms & Privacy Agreement Checkbox */}
        <View style={styles.termsRow}>
          <TouchableOpacity
            style={[styles.checkbox, termsAccepted && styles.checkboxActive]}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.8}
            accessibilityLabel="Accept Terms and Conditions"
          >
            {termsAccepted && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </TouchableOpacity>
          <Text style={styles.termsText}>
            I agree to GoGuide's{" "}
            <Text
              style={styles.termsLink}
              onPress={() => setPolicyModal({ visible: true, type: "terms" })}
            >
              Terms & Conditions
            </Text>{" "}
            and{" "}
            <Text
              style={styles.termsLink}
              onPress={() => setPolicyModal({ visible: true, type: "privacy" })}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>

        {/* Create Account */}
        <TouchableOpacity
          style={[styles.primaryBtn, isDisabled && styles.disabledBtn]}
          onPress={handleCreateAccount}
          disabled={isDisabled}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>
            {loading ? "Creating..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        {/* Sign In */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("auth/sign-in")}
        >
          <Text style={styles.secondaryText}>
            Already have an account? Sign In
          </Text>
        </TouchableOpacity>
            {/* Same-page Policy / Terms Modal */}
      <PolicyModal
        visible={policyModal.visible}
        type={policyModal.type}
        onClose={() => setPolicyModal({ visible: false, type: "terms" })}
      />
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    justifyContent: "center",
    padding: 20,
  },

  card: {
    backgroundColor: Colors.WHITE,
    borderRadius: 26,
    padding: 25,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },

  backBtn: {
    marginBottom: 10,
    width: 40,
  },

  title: {
    fontFamily: "Outfit-Bold",
    fontSize: 32,
    color: Colors.PRIMARY,
    marginBottom: 6,
  },

  subtitle: {
    fontFamily: "Outfit-Regular",
    fontSize: 15,
    color: Colors.GRAY,
    marginBottom: 30,
  },

  inputWrap: {
    marginBottom: 20,
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

  passwordWrap: {
    position: "relative",
  },

  eye: {
    position: "absolute",
    right: 14,
    top: 16,
  },

  primaryBtn: {
    marginTop: 30,
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
    marginTop: 25,
  },

  secondaryText: {
    textAlign: "center",
    color: Colors.PRIMARY,
    fontFamily: "Outfit-Bold",
    fontSize: 14,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#F8FAFC",
  },
  checkboxActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    color: "#64748B",
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.PRIMARY,
    fontFamily: "Outfit-Bold",
    textDecorationLine: "underline",
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
  signInShortcutBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#DC2626",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  signInShortcutText: {
    color: "#FFFFFF",
    fontFamily: "Outfit-Bold",
    fontSize: 11,
  },
});
