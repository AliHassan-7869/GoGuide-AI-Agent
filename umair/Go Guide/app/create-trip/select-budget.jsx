import { Stack, useRouter } from "expo-router";
import { useContext, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../Components/constants/constants";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function SelectBudget() {
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [selectedBudget, setSelectedBudget] = useState(null);

  const budgets = [
    {
      id: 1,
      label: "Luxury",
      value: "luxury",
      description: "High-end comfort and premium services",
      icon: "💎",
    },
    {
      id: 2,
      label: "Moderate",
      value: "moderate",
      description: "Balanced spending, good quality options",
      icon: "💰",
    },
    {
      id: 3,
      label: "Economical",
      value: "economical",
      description: "Budget-friendly, affordable options",
      icon: "🪙",
    },
  ];

  const handleSelectBudget = (value) => setSelectedBudget(value);

  const handleContinue = () => {
    if (!selectedBudget) return;

    setTripData((prev) => ({ ...prev, budget: selectedBudget }));
    console.log("Selected Budget:", selectedBudget);
    router.push("/create-trip/review-trip");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <StepProgressBar currentStep={5} totalSteps={6} stepTitle="Select Budget" />
      <Text style={styles.title}>Select Your Budget</Text>
      <Text style={styles.subtitle}>Choose spending habits for your trip</Text>

      <View style={styles.budgetContainer}>
        {budgets.map((budget) => (
          <TouchableOpacity
            key={budget.id}
            style={[
              styles.budgetBtn,
              selectedBudget === budget.value && styles.selectedBudget,
            ]}
            onPress={() => handleSelectBudget(budget.value)}
            activeOpacity={0.8}
          >
            <View style={styles.budgetContent}>
              {/* Emoji icon */}
              <Text style={styles.iconEmoji}>{budget.icon}</Text>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.budgetText,
                    selectedBudget === budget.value
                      ? styles.selectedBudgetText
                      : styles.unselectedBudgetText,
                  ]}
                >
                  {budget.label}
                </Text>
                <Text
                  style={[
                    styles.budgetDescription,
                    selectedBudget === budget.value
                      ? styles.selectedBudgetText
                      : styles.unselectedBudgetDescription,
                  ]}
                >
                  {budget.description}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.continueBtn,
          !selectedBudget && { backgroundColor: "#ccc" },
        ]}
        onPress={handleContinue}
        disabled={!selectedBudget}
        activeOpacity={0.8}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.WHITE,
    padding: 25,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 28,
    fontFamily: "Outfit-Bold",
    color: Colors.PRIMARY,
    marginTop: 50,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Outfit-Regular",
    color: Colors.GRAY,
    marginTop: 8,
    marginBottom: 30,
    textAlign: "center",
  },
  budgetContainer: {
    flex: 1,
    justifyContent: "center",
  },
  budgetBtn: {
    paddingVertical: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
    marginBottom: 20,
    backgroundColor: Colors.WHITE,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  selectedBudget: {
    backgroundColor: Colors.PRIMARY,
  },
  budgetContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  iconEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  budgetText: {
    fontSize: 18,
    fontFamily: "Outfit-Medium",
  },
  selectedBudgetText: {
    color: Colors.WHITE,
    fontFamily: "Outfit-Bold",
  },
  unselectedBudgetText: {
    color: Colors.PRIMARY,
  },
  budgetDescription: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    marginTop: 3,
  },
  unselectedBudgetDescription: {
    color: Colors.GRAY,
  },
  continueBtn: {
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    marginBottom: 30,
  },
  continueText: {
    color: Colors.WHITE,
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
});
