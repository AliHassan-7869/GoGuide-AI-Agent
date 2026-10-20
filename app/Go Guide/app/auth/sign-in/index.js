import { Colors } from "@/Components/constants/constants";
import { auth } from "@/Configs/FirebaseConfig";
import { Feather } from "@expo/vector-icons"; // Eye icon
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
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
    ScrollView
} from "react-native";

export default function SignIn() {
  const navigation = useNavigation();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // <-- password toggle

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const isDisabled = !email || !password || loading;

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const res = await signInWithEmailAndPassword(auth, email, password);
      console.log("User signed in:", res);
      AsyncStorage.setItem("loginUserData", JSON.stringify(res));
      Alert.alert("Success ✅", "Signed in successfully");

      router.replace("/mytrip");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
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

            {/* Email */}
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
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
              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.GRAY}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
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
