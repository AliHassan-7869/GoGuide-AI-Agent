import { Stack, useRouter } from "expo-router";
import { useContext, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import CalendarPicker from "react-native-calendar-picker";

import { Colors } from "../../Components/constants/constants";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext"; // lowercase 'context'

export default function SelectDates() {
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const onDateChange = (date, type) => {
    if (type === "END_DATE") {
      setEndDate(date);
    } else {
      setStartDate(date);
      setEndDate(null);
    }
  };

  const onDateSelectionContinue = () => {
    if (!startDate || !endDate) {
      console.log("Please select both start and end dates");
      return;
    }

    // Calculate number of days
    const diffTime = endDate.getTime() - startDate.getTime();
    const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    console.log("Start Date:", startDate.toDateString());
    console.log("End Date:", endDate.toDateString());
    console.log("Number of Days Selected:", numberOfDays);

    // Save in context
    setTripData((prev) => ({
      ...prev,
      startDate: startDate,
      endDate: endDate,
      totalNoOfDays: numberOfDays,
    }));

    // Navigate to next screen
    router.push("/create-trip/select-budget");
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
        }}
      />

      <ScrollView
        contentContainerStyle={{
          padding: 25,
          paddingTop: 75,
          backgroundColor: Colors.WHITE,
          flexGrow: 1,
        }}
      >
        <StepProgressBar currentStep={4} totalSteps={6} stepTitle="Travel Dates" />
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 35,
            marginTop: 10,
          }}
        >
          Travel Dates
        </Text>

        <View style={{ marginTop: 30 }}>
          <CalendarPicker
            allowRangeSelection
            onDateChange={onDateChange}
            minDate={new Date()}
            maxRangeDuration={7}
            selectedRangeStyle={{ backgroundColor: Colors.PRIMARY }}
            selectedDayTextStyle={{ color: Colors.WHITE }}
          />
        </View>

        <TouchableOpacity
          onPress={onDateSelectionContinue}
          style={{
            backgroundColor: startDate && endDate ? Colors.PRIMARY : "#ccc",
            padding: 15,
            borderRadius: 15,
            marginTop: 30,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: Colors.WHITE,
              fontSize: 18,
              fontFamily: "Outfit-Medium",
            }}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
