import { Redirect } from "expo-router";

// Direct shortcut route for Camping category
export default function Camping() {
  return <Redirect href={{ pathname: "/explore", params: { category: "camping" } }} />;
}

