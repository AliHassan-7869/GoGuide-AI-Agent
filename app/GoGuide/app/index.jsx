import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import Login from "../Components/Login";
import { purgeLegacyLoginData } from "../Components/utils/legacyLoginCleanup";
import { auth } from "../Configs/FirebaseConfig";

export default function Index() {
  const user = auth.currentUser;

  // Remove the sign-in credential older versions copied into device storage (see legacyLoginCleanup.js).
  useEffect(() => {
    purgeLegacyLoginData(AsyncStorage);
  }, []);

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      {user ? <Redirect href={"/mytrip"} /> : <Login />}
    </View>
  );
}
