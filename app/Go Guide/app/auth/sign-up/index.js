import { Colors } from "@/Components/constants/constants";
import { auth } from "@/Configs/FirebaseConfig";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
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
} from "react-native";

export default function Signup() {
  const navigation = useNavigation();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const isDisabled = !fullName || !email || !password || loading;

  const handleCreateAccount = async () => {
    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

      Alert.alert("Success 🎉", "Account created successfully");
      router.replace("auth/sign-in");
    } catch (error) {
      Alert.alert("Error", error.message);
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
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor={Colors.GRAY}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={styles.inputWrap}>
          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor={Colors.GRAY}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
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
});
