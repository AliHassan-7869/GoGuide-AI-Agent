import { Redirect } from "expo-router";

// Kept so old links keep working. The list now lives on the Explore screen.
export default function Forest() {
  return <Redirect href={{ pathname: "/explore", params: { category: "forest" } }} />;
}
