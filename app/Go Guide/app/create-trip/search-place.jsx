import { useRouter } from "expo-router";
import { useContext, useRef, useState } from "react";
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "../../Components/constants/constants";
import { CreateTripContext } from "../../context/CreateTripContext";

import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";

export default function SearchPlace() {
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);

  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [results, setResults] = useState([]);
  const [activeField, setActiveField] = useState(null);

  const timeoutRef = useRef(null);

  const searchPlace = (text, type) => {
    if (type === "from") {
      setFromQuery(text);
      setActiveField("from");
    } else {
      setToQuery(text);
      setActiveField("to");
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (text.length < 3) {
        setResults([]);
        return;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${text}&addressdetails=1&accept-language=en`,
          {
            headers: {
              "User-Agent": "TripPlannerApp/1.0",
            },
          }
        );

        const data = await response.json();

        setResults(data);
      } catch (error) {
        console.log("Search error:", error);
      }
    }, 500);
  };

  const selectPlace = (item) => {
    const place = {
      name: item.display_name,
      coordinates: {
        lat: item.lat,
        lng: item.lon,
      },
    };

    if (activeField === "from") {
      setFromQuery(item.display_name);

      setTripData((prev) => ({
        ...prev,
        fromLocation: place,
      }));
    }

    if (activeField === "to") {
      setToQuery(item.display_name);

      setTripData((prev) => ({
        ...prev,
        toLocation: place,
      }));
    }

    setResults([]);
  };

  const goNext = () => {
    if (!tripData?.fromLocation || !tripData?.toLocation) {
      alert("Please select both locations");
      return;
    }

    router.push("/create-trip/select-traveler");
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        paddingTop: 50,
        backgroundColor: Colors.WHITE,
      }}
    >
      <StepProgressBar currentStep={1} totalSteps={6} stepTitle="Select Route" />
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Select Your Route
      </Text>

      {/* FROM */}
      <Text style={{ marginBottom: 5 }}>From</Text>
      <TextInput
        placeholder="Starting location..."
        value={fromQuery}
        onChangeText={(text) => searchPlace(text, "from")}
        style={{
          height: 52,
          backgroundColor: "#F2F2F2",
          borderRadius: 12,
          paddingHorizontal: 16,
          fontSize: 16,
          marginBottom: 15,
        }}
      />

      {/* TO */}
      <Text style={{ marginBottom: 5 }}>To</Text>
      <TextInput
        placeholder="Destination..."
        value={toQuery}
        onChangeText={(text) => searchPlace(text, "to")}
        style={{
          height: 52,
          backgroundColor: "#F2F2F2",
          borderRadius: 12,
          paddingHorizontal: 16,
          fontSize: 16,
        }}
      />

      {/* SEARCH RESULTS */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.place_id.toString()}
        style={{ marginTop: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => selectPlace(item)}
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderColor: "#eee",
            }}
          >
            <Text style={{ fontSize: 14 }}>{item.display_name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* CONTINUE BUTTON */}
      <TouchableOpacity
        onPress={goNext}
        style={{
          backgroundColor: Colors.PRIMARY,
          padding: 15,
          borderRadius: 12,
          marginTop: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
}