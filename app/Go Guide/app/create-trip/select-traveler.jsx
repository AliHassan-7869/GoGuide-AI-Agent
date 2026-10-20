import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "../../Components/constants/constants";
import { SelectTravelerList } from "../../Components/constants/Option";
import OptionCard from "../../Components/CreateTrip/OptionCard";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function SelectTraveler() {
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [selectedTraveler, setSelectedTraveler] = useState(null);

  // Save selection in context
  useEffect(() => {
    if (selectedTraveler) {
      setTripData((prev) => ({ ...prev, traveler: selectedTraveler }));
    }
  }, [selectedTraveler]);

  const handleContinue = () => {
    if (selectedTraveler) router.push("/create-trip/interest-page");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Progress & Title */}
      <StepProgressBar currentStep={2} totalSteps={6} stepTitle="Who is Traveling?" />
      <Text style={styles.title}>Select Travelers</Text>
      <Text style={styles.subtitle}>Choose your traveler</Text>

      {/* Traveler Options */}
      <FlatList
        data={SelectTravelerList}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedTraveler(item)}
            style={[
              styles.optionWrapper,
              selectedTraveler?.id === item?.id && styles.selectedOption,
            ]}
          >
            <OptionCard
              option={item}
              selected={selectedTraveler?.id === item?.id}
            />
          </TouchableOpacity>
        )}
      />

      {/* Continue Button Fixed at Bottom */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueBtn,
            !selectedTraveler && { backgroundColor: "#ccc" },
          ]}
          onPress={handleContinue}
          disabled={!selectedTraveler}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: Colors.WHITE,
  },
  title: {
    fontSize: 35,
    marginTop: 50,
    fontFamily: "Outfit-Bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 23,
    fontFamily: "Outfit-Medium",
    marginBottom: 20,
  },
  optionWrapper: {
    marginBottom: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedOption: {
    borderColor: Colors.PRIMARY,
    borderWidth: 2,
  },
  footer: {
    position: "absolute",
    bottom: 90,
    left: 25,
    right: 25,
  },
  continueBtn: {
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
  },
  continueText: {
    color: Colors.WHITE,
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
});
