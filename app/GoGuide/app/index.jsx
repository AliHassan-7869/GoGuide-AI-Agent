import { Redirect } from "expo-router";
import { View } from "react-native";
import Login from "../Components/Login";
import { auth } from "../Configs/FirebaseConfig";

export default function Index() {
  const user = auth.currentUser;

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
