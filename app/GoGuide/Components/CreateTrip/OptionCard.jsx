import { Text, View } from "react-native";
import { Colors } from "../constants/constants";

export default function OptionCard({ option, selectedTraveler }) {
  const description =
    option?.desc ?? option?.description ?? option?.details ?? "";

  return (
    <View
      style={[
        {
          padding: 30,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          backgroundColor: Colors.GRAY_100,
          borderRadius: 20,
        },
        selectedTraveler?.id === option?.id && {
          borderWidth: 3,
          borderColor: Colors.PRIMARY,
        },
      ]}
    >
      <View>
        <Text
          style={{
            fontSize: 20,
            fontFamily: "Outfit-Bold",
          }}
        >
          {option?.title}
        </Text>

        <Text
          style={{
            fontSize: 17,
            fontFamily: "Outfit-Regular",
            color: Colors.GRAY,
          }}
        >
          {description}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 40,
        }}
      >
        {option?.icon}
      </Text>
    </View>
  );
}
