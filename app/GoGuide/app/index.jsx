import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Login from "../Components/Login";
import { useTheme } from "../Components/constants/theme";
import { purgeLegacyLoginData } from "../Components/utils/legacyLoginCleanup";
import { auth } from "../Configs/FirebaseConfig";

export default function Index() {
  const theme = useTheme();
  const [authReady, setAuthReady] = useState(Boolean(auth.currentUser));
  const [user, setUser] = useState(auth.currentUser);

  // Remove the sign-in credential older versions copied into device storage (see legacyLoginCleanup.js).
  useEffect(() => {
    purgeLegacyLoginData(AsyncStorage);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  if (!authReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const isAuthenticated = Boolean(user); // Treats user.isAnonymous === true as an authenticated guest session

  return (
    <View style={{ flex: 1 }}>
      {isAuthenticated ? (
        <Redirect href={user?.isAnonymous ? "/(tabs)/discover" : "/(tabs)/mytrip"} />
      ) : (
        <Login />
      )}
    </View>
  );
}
