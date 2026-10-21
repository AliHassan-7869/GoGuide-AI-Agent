import { Redirect } from "expo-router";

// Direct shortcut route to Explore screen with Cities filter
export default function Cities() {
  return <Redirect href={{ pathname: "/explore", params: { category: "cities" } }} />;
}
