import { Stack, useRouter } from "expo-router";
import { openExternalUrl } from "../../Components/utils/openExternalUrl";
import { directionsUrl, placeUrl, routeUrl } from "../../Components/utils/mapsLinks";
import { useContext, useEffect, useState, useRef, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View, Image, Linking, Share, Platform, Animated, Modal, Alert, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../Configs/FirebaseConfig";
import { collection, query, where, getDocs, orderBy, limit, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import { CreateTripContext } from "../../context/CreateTripContext";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import WeatherCard from "../../Components/MyTrips/WeatherCard";
import PackingList from "../../Components/MyTrips/PackingList";
import StartNewTripCard from "../../Components/MyTrips/StartNewTripCard";
import DayRouteModal from "../../Components/MyTrips/DayRouteModal";
import ExpenseTrackerModal from "../../Components/MyTrips/ExpenseTrackerModal";
import PrintableItineraryModal from "../../Components/MyTrips/PrintableItineraryModal";
import ShareTripModal from "../../Components/MyTrips/ShareTripModal";
import AddActivityModal from "../../Components/MyTrips/AddActivityModal";
import OfflineVaultModal from "../../Components/MyTrips/OfflineVaultModal";
import FavoriteHeartButton from "../../Components/FavoriteHeartButton";
import { buildFlightItinerary } from "../../Components/utils/FlightEngine";
import { normalizeTrip } from "../../Components/utils/TripNormalizer";
import { downloadItineraryPDF } from "../../Components/utils/PdfDownloadService";
import { saveTripToBookings, addActivityBooking } from "../../Components/utils/BookingService";
import { fetchDestinationEssentials } from "../../Configs/AiModel";
import {
  convertPriceString,
  hotelPriceLabel,
  getCurrencySymbol,
  convertAmount,
  detectCurrencyFromLocation,
  convertBetweenCurrencies,
} from "../../Components/constants/Currency";
import {
  DEFAULT_HD_TRAVEL_IMAGE,
  getDestinationImage,
  sanitizeImageUrl,
} from "../../Components/constants/Destinations";

import { TouchableOpacity } from "../../Components/ui/Touchable";
import { useHotelImages } from "../../Components/utils/HotelImages";

function SafeTripImage({ uri, style, fallbackUri = DEFAULT_HD_TRAVEL_IMAGE }) {
  const [hasError, setHasError] = useState(false);
  const imgSrc = hasError ? fallbackUri : (uri ? sanitizeImageUrl(uri, fallbackUri) : fallbackUri);

  return (
    <Image
      source={{ uri: imgSrc }}
      style={style}
      onError={() => {
        if (!hasError) setHasError(true);
      }}
    />
  );
}

export default function MyTrip() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tripData, setTripData, preferences } = useContext(CreateTripContext);
  const theme = useTheme();
  const plan = normalizeTrip(tripData?.aiTripPlan || tripData);
  const hotelPhotos = useHotelImages(plan?.hotels, plan?.destination);

  const safeTopPadding = Platform.select({
    android: insets.top + 8,
    ios: Math.max(insets.top, 44),
    default: 16,
  });
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState("all"); // "all" or day number
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [essentials, setEssentials] = useState(null);
  const [bookedActivities, setBookedActivities] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedDayForRoute, setSelectedDayForRoute] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [targetDayForExpense, setTargetDayForExpense] = useState("Day 1");
  const [isSavedToTripsLocal, setIsSavedToTripsLocal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState(1);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const [userTripsList, setUserTripsList] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [showHubView, setShowHubView] = useState(false);

  // Smooth Shimmer pulse animation for skeleton loading
  const pulseAnim = useMemo(() => new Animated.Value(0.3), []);

  // Slide & Fade animation for multi-trip carousel
  const carouselSlideAnim = useMemo(() => new Animated.Value(-20), []);
  const carouselFadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const dest = plan?.destination || tripData?.destination || tripData?.toLocation?.name;
    if (dest) {
      fetchDestinationEssentials(dest)
        .then((data) => {
          if (data) setEssentials(data);
        })
        .catch(() => {});
    }
  }, [plan?.destination, tripData?.destination]);

  useEffect(() => {
    AsyncStorage.getItem("@goguide_user_bookings").then((raw) => {
      if (raw) {
        try {
          const list = JSON.parse(raw);
          const actMap = {};
          list.forEach((b) => {
            if (b.type === "Activities") actMap[b.title] = true;
          });
          setBookedActivities(actMap);
        } catch (e) {}
      }
    });
  }, []);

  const handleBookActivity = async (activity, dayNumber) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!activity) return;
    try {
      const destName = plan?.destination || tripData?.destination || "Destination";
      await addActivityBooking(activity, dayNumber, destName, tripData, auth.currentUser);
      setBookedActivities((prev) => ({ ...prev, [activity.placeName]: true }));
      Alert.alert("Activity Pass Saved! 🎫", `"${activity.placeName}" has been added to My Bookings.`);
    } catch (e) {
      console.warn("Error booking activity:", e);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem("@goguide_user_trips").then((raw) => {
      if (raw) {
        try {
          const list = JSON.parse(raw);
          const found = list.some(
            (t) =>
              (activeTripId && (String(t.id) === String(activeTripId) || String(t?.tripData?.id) === String(activeTripId))) ||
              (plan?.destination && (t.destination === plan.destination || t.aiTripPlan?.destination === plan.destination))
          );
          if (found) setIsSavedToTripsLocal(true);
        } catch (e) {}
      }
    });
  }, [activeTripId, plan?.destination]);

  const handleSaveCurrentTripToUserTrips = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!plan && !tripData) return;
    if (isSavedToTripsLocal) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("This itinerary is already saved in your My Trips!");
      } else {
        Alert.alert("Already Saved", "This itinerary is already saved in your My Trips!");
      }
      return;
    }
    try {
      const initialId = activeTripId || tripData?.id || `trip_${Date.now()}`;
      let finalTripId = initialId;
      const user = auth.currentUser;
      const email = user?.email || "traveler@goguide.com";
      const destTitle =
        plan?.destination || tripData?.destination || tripData?.toLocation?.name || "Trip";
      const destNorm = String(destTitle).toLowerCase().trim();
      const createdAtIso = new Date().toISOString();

      // Save to Firestore first (if signed in) so local & cloud share the exact same ID
      if (user?.email) {
        try {
          const docRef = await addDoc(collection(db, "UserTrips"), {
            userEmail: user.email,
            tripData: { ...tripData, aiTripPlan: plan },
            createdAt: createdAtIso,
          });
          if (docRef?.id) {
            finalTripId = docRef.id;
          }
        } catch (e) {}
      }

      const record = {
        id: finalTripId,
        userEmail: email,
        destination: destTitle,
        tripData: { ...tripData, id: finalTripId, aiTripPlan: plan },
        aiTripPlan: plan,
        createdAt: createdAtIso,
      };

      const raw = await AsyncStorage.getItem("@goguide_user_trips");
      const list = raw ? JSON.parse(raw) : [];
      const updated = [
        record,
        ...(Array.isArray(list) ? list : []).filter((t) => {
          const tDest = String(
            t?.aiTripPlan?.destination || t?.destination || t?.toLocation?.name || ""
          )
            .toLowerCase()
            .trim();
          return t.id !== finalTripId && t.id !== initialId && (!destNorm || tDest !== destNorm);
        }),
      ];
      await AsyncStorage.setItem("@goguide_user_trips", JSON.stringify(updated));
      setUserTripsList(updated);
      setActiveTripId(finalTripId);

      setIsSavedToTripsLocal(true);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Saved to My Trips! ✅ This trip itinerary is safely stored in your trips.");
      } else {
        Alert.alert("Saved to My Trips! ✅", "This trip itinerary is safely stored in your trips.");
      }
    } catch (e) {
      console.warn("Save trip error:", e);
    }
  };

  useEffect(() => {
    if (userTripsList.length > 0) {
      Animated.parallel([
        Animated.timing(carouselSlideAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(carouselFadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [userTripsList.length]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [loading]);

  // Save to AsyncStorage whenever tripData updates with an AI plan
  useEffect(() => {
    if (tripData?.aiTripPlan) {
      AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(tripData))
        .then(() => setIsOfflineCached(true))
        .catch((e) => console.log("Failed to cache trip:", e));
    }
  }, [tripData]);

  const GetMyTrips = async () => {
    try {
      let localList = [];
      const storedLocal = await AsyncStorage.getItem("@goguide_user_trips");
      if (storedLocal) {
        try {
          const parsedLocal = JSON.parse(storedLocal);
          if (Array.isArray(parsedLocal)) localList = parsedLocal;
        } catch (e) {}
      }

      let remoteTrips = [];
      const user = auth.currentUser;
      if (user?.email) {
        try {
          const q = query(
            collection(db, "UserTrips"),
            where("userEmail", "==", user.email),
            orderBy("createdAt", "desc"),
            limit(15)
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((docSnap) => {
            const d = docSnap.data();
            remoteTrips.push({
              id: docSnap.id,
              ...(d.tripData || {}),
              aiTripPlan: d.aiTripPlan || d.tripData?.aiTripPlan,
              createdAt: d.createdAt,
            });
          });
        } catch (fbErr) {
          console.log("Firestore trips query:", fbErr?.message);
        }
      }

      // Deduplicate across remote + local by both ID and normalized destination name
      const seenIds = new Set();
      const seenDests = new Set();
      const dedupedTrips = [];
      [...remoteTrips, ...localList].forEach((t) => {
        const destName =
          t?.aiTripPlan?.destination ||
          t?.toLocation?.name ||
          t?.destination ||
          t?.locationInfo?.name ||
          "";
        if (!destName) return;
        const destNorm = String(destName).toLowerCase().trim();
        const idStr = t.id ? String(t.id) : "";
        if ((idStr && seenIds.has(idStr)) || seenDests.has(destNorm)) {
          return;
        }
        if (idStr) seenIds.add(idStr);
        seenDests.add(destNorm);
        dedupedTrips.push(t);
      });

      if (localList.length > dedupedTrips.length) {
        AsyncStorage.setItem("@goguide_user_trips", JSON.stringify(dedupedTrips)).catch(() => {});
      }

      if (dedupedTrips.length > 0) {
        setUserTripsList(dedupedTrips);
      }
    } catch (e) {
      console.log("Error loading trips:", e);
    } finally {
      setLoading(false);
    }
  };

  // Load trips from local storage and Firestore
  useEffect(() => {
    const timer = setTimeout(() => {
      GetMyTrips();
    }, 0);
    return () => clearTimeout(timer);
  }, [auth.currentUser]);

  const handleSelectTrip = (selectedTrip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowHubView(false);
    setTripData(selectedTrip);
    AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(selectedTrip)).catch(() => {});
  };

  const handleDeleteTrip = (tripToDelete) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!tripToDelete) return;

    const destTitle =
      tripToDelete?.aiTripPlan?.destination ||
      tripToDelete?.destination ||
      tripToDelete?.locationInfo?.name ||
      "this trip";

    const promptMessage = `Are you sure you want to delete your trip to "${destTitle}"? This action cannot be undone.`;

    const confirmDelete = async () => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const targetId = tripToDelete?.id || (tripToDelete === tripData ? activeTripId : null);
        const targetDest =
          tripToDelete?.aiTripPlan?.destination ||
          tripToDelete?.destination ||
          tripToDelete?.locationInfo?.name;

        // 1. Remove from Firestore if user is authenticated and document id is known
        if (targetId && auth.currentUser) {
          try {
            await deleteDoc(doc(db, "UserTrips", targetId));
          } catch (fbErr) {
            console.log("Firestore delete error:", fbErr?.message);
          }
        }

        // 2. Filter from userTripsList state & local AsyncStorage
        const updatedTrips = userTripsList.filter((t) => {
          if (targetId && t.id) return t.id !== targetId;
          const tDest = t.aiTripPlan?.destination || t.destination || t.locationInfo?.name;
          if (targetDest && tDest) return tDest !== targetDest;
          return true;
        });

        setUserTripsList(updatedTrips);
        await AsyncStorage.setItem("@goguide_user_trips", JSON.stringify(updatedTrips));

        // 3. Handle active/current plan if it matches the deleted trip
        const currentDest = plan?.destination || tripData?.locationInfo?.name;
        const isCurrentActive =
          (targetId && activeTripId === targetId) ||
          (targetDest && currentDest && targetDest === currentDest) ||
          tripToDelete === tripData;

        if (isCurrentActive) {
          if (updatedTrips.length > 0) {
            const nextTrip = updatedTrips[0];
            setActiveTripId(nextTrip.id || null);
            setTripData(nextTrip);
            setSelectedDay("all");
            await AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(nextTrip));
          } else {
            setActiveTripId(null);
            setTripData({});
            setSelectedDay("all");
            await AsyncStorage.removeItem('@goguide_cached_trip');
          }
        }
        Alert.alert("Trip Deleted", `Your trip to "${destTitle}" has been deleted.`);
      } catch (e) {
        console.log("Error deleting trip:", e);
        Alert.alert("Delete Failed", "Could not delete this trip. Please try again.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Delete trip to "${destTitle}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Delete Trip?",
        promptMessage,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: confirmDelete,
          },
        ]
      );
    }
  };

  const createNewTrip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTripData({});
    router.push("/create-trip/search-place");
  };

  // 1. Add to Calendar Sync (Google & Apple Calendar)
  const addToCalendar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const dest = plan?.destination || "Vacation";
      const title = encodeURIComponent(`✈️ Trip to ${dest}`);

      const scheduleLines = (plan?.itinerary || []).map((d) => {
        const acts = (d.activities || []).map(a => `• ${a.time || ''}: ${a.placeName} - ${a.details || ''}`).join('\n');
        return `Day ${d.day} (${d.theme || ''}):\n${acts}`;
      }).join('\n\n');

      const details = encodeURIComponent(
        `GoGuide AI Itinerary for ${dest}\n` +
        `Duration: ${plan?.duration || 'Multi-day'}\n` +
        `Budget: ${plan?.budget || 'Moderate'}\n\n` +
        `Daily Schedule:\n${scheduleLines}\n\n` +
        `Generated with GoGuide AI Travel Agent 🚀`
      );

      const location = encodeURIComponent(dest);

      // Format ISO dates to UTC format: YYYYMMDDTHHmmssZ
      let startStr = "";
      let endStr = "";
      try {
        const s = tripData?.startDate ? new Date(tripData.startDate) : new Date();
        const e = tripData?.endDate ? new Date(tripData.endDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        startStr = fmt(s);
        const nextDay = new Date(e.getTime() + 24 * 60 * 60 * 1000);
        endStr = fmt(nextDay);
      } catch (err) {
        const today = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        startStr = today;
        endStr = today;
      }

      const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
      Linking.openURL(calUrl);
    } catch (e) {
      console.log("Error syncing calendar:", e);
      Alert.alert("Calendar Sync", "Unable to open calendar application. Try copying your itinerary text instead.");
    }
  };

  // 2. Generate Clean Printable Itinerary Document
  const generateFormattedItinerary = () => {
    let text = `✈️ GOGUIDE AI TRAVEL ITINERARY\n`;
    text += `========================================\n`;
    text += `📍 Destination: ${plan?.destination || "Vacation"}\n`;
    text += `⏱️ Duration: ${plan?.duration || "N/A"}\n`;
    text += `💰 Budget: ${plan?.budget || "Moderate"}\n`;
    text += `👥 Traveler: ${plan?.traveler || "Solo Explorer"}\n`;
    if (plan?.weatherBrief) {
      text += `🌤️ Weather: ${plan.weatherBrief}\n`;
    }
    text += `========================================\n\n`;

    if (plan?.flights?.details) {
      text += `✈️ FLIGHT LOGISTICS:\n`;
      text += `${plan.flights.details} (Estimated: ${plan.flights.price || "N/A"})\n\n`;
    }

    if (plan?.hotels?.length > 0) {
      text += `🏨 RECOMMENDED STAYS:\n`;
      plan.hotels.forEach((h, idx) => {
        text += `${idx + 1}. ${h.name} (${h.rating || "4.8"}★) - ${h.price || ""}\n`;
        text += `   Address: ${h.address || h.details || "Central location"}\n`;
      });
      text += `\n`;
    }

    if (plan?.itinerary?.length > 0) {
      text += `🗓️ DAILY SCHEDULE:\n`;
      plan.itinerary.forEach((d) => {
        text += `\n--- DAY ${d.day}: ${d.theme || "Exploration"} ---\n`;
        (d.activities || []).forEach((act) => {
          text += `• [${act.time || "Activity"}] ${act.placeName}\n`;
          if (act.details) text += `  Details: ${act.details}\n`;
          if (act.tickets) text += `  Tickets/Fee: ${act.tickets}\n`;
        });
      });
      text += `\n`;
    }

    if (plan?.packingList?.length > 0) {
      text += `🎒 PACKING CHECKLIST:\n`;
      plan.packingList.forEach((p) => {
        text += `• [ ] ${p.item || p} (${p.category || "Essential"})\n`;
      });
      text += `\n`;
    }

    text += `========================================\n`;
    text += `Generated with GoGuide AI Travel Agent 🚀\n`;
    return text;
  };

  const exportItinerary = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const fullDoc = generateFormattedItinerary();
      await Share.share({
        title: `Trip Itinerary - ${plan?.destination}`,
        message: fullDoc,
      });
    } catch (err) {
      console.log("Error sharing:", err);
    }
  };

  // 1-Click Direct PDF Downloader (No print/pdf dialog - direct file download)
  const handleDirectDownloadPDF = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const activeSelectedTrip = userTripsList.find((t) => t.id === activeTripId) || userTripsList[0];
    const targetPlan = plan || activeSelectedTrip?.aiTripPlan || activeSelectedTrip?.tripData?.aiTripPlan || tripData?.aiTripPlan || tripData;
    const dest = targetPlan?.destination || activeSelectedTrip?.destination || tripData?.locationInfo?.name || "Trip";
    try {
      await downloadItineraryPDF(targetPlan, dest);
    } catch (e) {
      console.log("PDF download error:", e);
      Alert.alert("Download Error", "Unable to download PDF. Please try again.");
    }
  };

  // 1-Click Save to My Bookings & Auto-Persist Trip in My Trips
  const handleSaveToBookings = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const dest = plan?.destination || tripData?.locationInfo?.name || "Trip";
    try {
      await saveTripToBookings(tripData, auth.currentUser);
      await GetMyTrips();

      const successTitle = "Saved to My Bookings! 🎫";
      const successMsg = `Your Hotel and Flight booking passes for "${dest}" have been saved to My Bookings, and your trip is automatically saved in My Trips.`;

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const viewNow = window.confirm(`${successTitle}\n\n${successMsg}\n\nWould you like to open My Bookings now to view your passes?`);
        if (viewNow) {
          router.push("/my-bookings");
        }
      } else {
        Alert.alert(
          successTitle,
          successMsg,
          [
            { text: "Stay on Trip", style: "cancel" },
            { text: "View Bookings", onPress: () => router.push("/my-bookings") }
          ]
        );
      }
    } catch (e) {
      console.error("Save to bookings error:", e);
      Alert.alert("Save Error", "Could not save to bookings. Please try again.");
    }
  };

  // 3. Interactive Multi-Stop Day Route in Maps (exact coordinates when known)
  const openDayRouteInMaps = (dayObj) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = routeUrl(dayObj?.activities || [], plan?.destination);
    if (url) openExternalUrl(url);
  };

  // 4. Direct Turn-by-Turn Navigation for an activity or hotel item
  const getDirectDirections = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openExternalUrl(directionsUrl(item, plan?.destination));
  };

  const openInMaps = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openExternalUrl(placeUrl(item, plan?.destination));
  };

  const openBookingCom = (hotelName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const dest = plan?.destination || tripData?.destination || "";
    const query = encodeURIComponent(`${hotelName} ${dest}`.trim());
    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${query}`;
    openExternalUrl(bookingUrl);
  };

  // Synchronize trip modifications across Active State, Local Storage, and Cloud Firestore
  const syncTripChanges = async (updatedTrip) => {
    try {
      setTripData(updatedTrip);
      await AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(updatedTrip));

      // Sync with userTripsList & AsyncStorage @goguide_user_trips
      const destTarget = updatedTrip?.aiTripPlan?.destination || updatedTrip?.destination;
      const targetId = updatedTrip?.id || activeTripId;

      const updatedList = userTripsList.map((t) => {
        if (targetId && t.id === targetId) {
          return { ...t, ...updatedTrip, id: targetId };
        }
        const tDest = t.aiTripPlan?.destination || t.destination;
        if (destTarget && tDest === destTarget) {
          return { ...t, ...updatedTrip };
        }
        return t;
      });

      setUserTripsList(updatedList);
      await AsyncStorage.setItem('@goguide_user_trips', JSON.stringify(updatedList));

      // Sync with Firestore if user is authenticated and trip has a document ID
      if (targetId && auth.currentUser) {
        try {
          await updateDoc(doc(db, "UserTrips", targetId), {
            tripData: updatedTrip,
            updatedAt: new Date().toISOString(),
          });
        } catch (fbErr) {
          console.log("Firestore sync notice (local updated):", fbErr?.message);
        }
      }
    } catch (err) {
      console.log("Error syncing trip changes:", err);
    }
  };

  // Toggle activity visited/completed state
  const toggleActivityVisited = (dayNumber, activityIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedItinerary = plan.itinerary.map((d) => {
      if (String(d.day) === String(dayNumber)) {
        const updatedActivities = [...(d.activities || [])];
        if (updatedActivities[activityIndex]) {
          const current = !!updatedActivities[activityIndex].isVisited;
          updatedActivities[activityIndex] = {
            ...updatedActivities[activityIndex],
            isVisited: !current,
          };
        }
        return { ...d, activities: updatedActivities };
      }
      return d;
    });

    const updatedTrip = {
      ...tripData,
      aiTripPlan: {
        ...plan,
        itinerary: updatedItinerary,
      },
    };

    syncTripChanges(updatedTrip);
  };

  // Remove an activity from day
  const deleteActivityFromDay = (dayNumber, activityIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const executeDelete = () => {
      const updatedItinerary = plan.itinerary.map((d) => {
        if (String(d.day) === String(dayNumber)) {
          const updatedActivities = [...(d.activities || [])];
          updatedActivities.splice(activityIndex, 1);
          return { ...d, activities: updatedActivities };
        }
        return d;
      });

      const updatedTrip = {
        ...tripData,
        aiTripPlan: {
          ...plan,
          itinerary: updatedItinerary,
        },
      };

      syncTripChanges(updatedTrip);
    };

    if (Platform.OS === "web") {
      if (window.confirm("Remove this activity from your itinerary?")) {
        executeDelete();
      }
    } else {
      Alert.alert("Remove Activity", "Remove this activity from your itinerary?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: executeDelete },
      ]);
    }
  };

  // Add custom activity to day
  const handleAddActivity = (dayNumber, newActivity) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updatedItinerary = plan.itinerary.map((d) => {
      if (String(d.day) === String(dayNumber)) {
        return {
          ...d,
          activities: [...(d.activities || []), newActivity],
        };
      }
      return d;
    });

    const updatedTrip = {
      ...tripData,
      aiTripPlan: {
        ...plan,
        itinerary: updatedItinerary,
      },
    };

    syncTripChanges(updatedTrip);
    Alert.alert("Activity Added!", `"${newActivity.placeName}" added to Day ${dayNumber}.`);
  };

  // Persist updated expenses
  const handleSaveExpenses = (updatedExpenses) => {
    const updatedTrip = {
      ...tripData,
      expenses: updatedExpenses,
    };
    syncTripChanges(updatedTrip);
  };

  // AI Regenerate Single Day (Micro-edit preserving all other days)
  const [regeneratingDay, setRegeneratingDay] = useState(null);

  const handleRegenerateDay = async (dayNumber) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const destName = plan?.destination?.split(",")[0]?.trim() || tripData?.toLocation?.name?.split(",")[0]?.trim() || "Destination";
    
    const proceedWithRegeneration = async () => {
      try {
        setRegeneratingDay(dayNumber);
        const { askTravelAssistant } = require("../../Configs/AiModel");
        const { robustParseJson } = require("../../Components/utils/TripNormalizer");

        const prompt = `Generate a completely fresh alternative single-day itinerary for Day ${dayNumber} in ${destName}.
Budget: ${plan?.budget || "Moderate"}.
Return ONLY valid JSON matching this exact structure with morning, afternoon, and evening activities:
{
  "theme": "Fresh theme for Day ${dayNumber}",
  "activities": [
    {"time": "Morning (9:30 AM)", "placeName": "New Attraction / Landmark", "details": "Specific insider tip", "tickets": "Free - $15"},
    {"time": "Afternoon (2:00 PM)", "placeName": "New Cultural Quarter / Cafe", "details": "Artisanal stroll and regional bite", "tickets": "Free"},
    {"time": "Evening (7:00 PM)", "placeName": "Twilight Viewpoint & Dining", "details": "Evening dinner and scenic vista", "tickets": "$20 - $35"}
  ]
}`;

        const res = await askTravelAssistant(prompt, [], plan);
        let newDayData = null;
        if (res && res.reply) {
          const parsed = robustParseJson(res.reply);
          if (parsed && Array.isArray(parsed.activities) && parsed.activities.length > 0) {
            newDayData = parsed;
          }
        }

        // Resilient fallback blueprint if LLM fails
        if (!newDayData) {
          newDayData = {
            theme: `Day ${dayNumber}: Alternative ${destName} Cultural Discovery`,
            activities: [
              { time: "Morning (9:30 AM)", placeName: `${destName} Botanical Oasis & Heritage Courtyard`, details: "Tranquil morning garden stroll away from the crowds.", tickets: "Free" },
              { time: "Afternoon (1:30 PM)", placeName: `${destName} Old Quarter Artisanal Street`, details: "Explore independent boutique ateliers, bookstores, and specialty espresso cafes.", tickets: "Free" },
              { time: "Evening (7:00 PM)", placeName: `Panoramic ${destName} Skyline Bistro`, details: "Savor regional gastronomy and sunset panoramic vistas.", tickets: "$25 - $40" }
            ]
          };
        }

        const updatedItinerary = plan.itinerary.map((d) => {
          if (String(d.day) === String(dayNumber)) {
            return {
              ...d,
              theme: newDayData.theme || d.theme,
              activities: newDayData.activities,
            };
          }
          return d;
        });

        const updatedTrip = {
          ...tripData,
          aiTripPlan: {
            ...plan,
            itinerary: updatedItinerary,
          },
        };

        syncTripChanges(updatedTrip);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Day Regenerated! ✨", `Day ${dayNumber} refreshed with a brand new schedule.`);
      } catch (err) {
        Alert.alert("Notice", "Could not refresh day schedule right now. Please try again.");
      } finally {
        setRegeneratingDay(null);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Regenerate Day ${dayNumber} with fresh activities? Your other days will stay untouched.`)) {
        proceedWithRegeneration();
      }
    } else {
      Alert.alert(
        `Regenerate Day ${dayNumber}?`,
        "AI will generate a fresh theme and schedule for this day while keeping the rest of your trip completely untouched.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Regenerate ✨", onPress: proceedWithRegeneration },
        ]
      );
    }
  };

  // Clone / Save Trip to User Account
  const handleCloneTrip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const clonedTrip = {
        ...tripData,
        clonedFrom: activeTripId || "shared",
        clonedAt: new Date().toISOString(),
        id: `cloned_${Date.now()}`,
      };

      if (auth.currentUser?.email) {
        const docRef = await addDoc(collection(db, "UserTrips"), {
          userEmail: auth.currentUser.email,
          tripData: clonedTrip,
          createdAt: new Date().toISOString(),
        });
        clonedTrip.id = docRef.id;
      }

      setTripData(clonedTrip);
      setActiveTripId(clonedTrip.id);
      await AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(clonedTrip));
      setShowShareModal(false);

      if (auth.currentUser) {
        GetMyTrips();
      }

      Alert.alert(
        "Trip Cloned!",
        `Successfully saved a copy of "${plan?.destination || "Trip"}" to your account. You can now customize it!`
      );
    } catch (err) {
      console.log("Error cloning trip:", err);
      Alert.alert("Cloning Notice", "Trip copied to your offline storage successfully.");
    }
  };

  // Modern Shimmer Skeleton Loading State
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: safeTopPadding }]}>
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* Skeleton Header */}
        <View style={styles.header}>
          <View>
            <Animated.View style={[styles.skeletonLine, { width: 140, height: 26, opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonLine, { width: 90, height: 16, marginTop: 6, opacity: pulseAnim }]} />
          </View>
          <View style={styles.headerActions}>
            <View style={[styles.iconButton, { opacity: 0.5 }]} />
            <View style={[styles.iconButton, { marginLeft: 10, opacity: 0.5 }]} />
          </View>
        </View>

        {/* Skeleton Hero Banner */}
        <Animated.View style={[styles.skeletonCard, { height: 220, opacity: pulseAnim }]} />

        {/* Skeleton Widgets */}
        <Animated.View style={[styles.skeletonCard, { height: 75, marginTop: 15, opacity: pulseAnim }]} />
        <Animated.View style={[styles.skeletonCard, { height: 110, marginTop: 15, opacity: pulseAnim }]} />

        {/* Skeleton Section Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 25, marginBottom: 12 }}>
          <Animated.View style={[styles.skeletonLine, { width: 150, height: 20, opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonLine, { width: 60, height: 16, opacity: pulseAnim }]} />
        </View>

        {/* Skeleton Hotel Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Animated.View style={[styles.skeletonCard, { width: 220, height: 170, marginRight: 14, opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonCard, { width: 220, height: 170, opacity: pulseAnim }]} />
        </ScrollView>
      </View>
    );
  }

  if (!plan || showHubView) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: safeTopPadding }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <StartNewTripCard 
            userTrips={userTripsList} 
            onSelectTrip={(selectedTrip) => {
              setShowHubView(false);
              handleSelectTrip(selectedTrip);
            }} 
            onDeleteTrip={handleDeleteTrip}
          />
        </ScrollView>
      </View>
    );
  }

  const daysList = Array.isArray(plan?.itinerary) ? plan.itinerary : [];
  const filteredDays = selectedDay === "all" 
    ? daysList 
    : daysList.filter(d => String(d.day) === String(selectedDay));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: safeTopPadding }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 6 }}>
          <TouchableOpacity
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowHubView(true);
              setTripData(null);
              try {
                await AsyncStorage.removeItem('@goguide_cached_trip');
                await AsyncStorage.removeItem('@goguide_active_draft');
              } catch (e) {}
            }}
            style={[styles.backToHubBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={15} color={theme.text} />
            <Text style={[styles.backToHubText, { color: theme.text }]}>Trips</Text>
          </TouchableOpacity>

          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={[styles.title, { color: theme.text, fontSize: 19 }]} numberOfLines={1}>
              My Itinerary
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "nowrap" }}>
              <Text style={[styles.subtitle, { color: theme.subtext, fontSize: 12, flexShrink: 1 }]} numberOfLines={1}>
                {plan.destination}
              </Text>
              {isOfflineCached && (
                <TouchableOpacity 
                  onPress={() => setShowVaultModal(true)} 
                  style={styles.headerOfflinePill}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cloud-done" size={10} color="#10B981" />
                  <Text style={styles.headerOfflineText}>Vault</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete" 
            style={[styles.iconButton, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]} 
            onPress={() => handleDeleteTrip(tripData)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="View itinerary document" 
            style={[styles.iconButton, { marginLeft: 6 }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowExportModal(true);
            }}
          >
            <Ionicons name="document-text-outline" size={18} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { marginLeft: 6 }, isSavedToTripsLocal && { backgroundColor: "rgba(16, 185, 129, 0.15)" }]} 
            onPress={handleSaveCurrentTripToUserTrips}
            accessibilityLabel="Save to Trips"
          >
            <Ionicons name={isSavedToTripsLocal ? "bookmark" : "bookmark-outline"} size={18} color={isSavedToTripsLocal ? "#10B981" : theme.text} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose date" 
            style={[styles.iconButton, { marginLeft: 6 }]} 
            onPress={addToCalendar}
          >
            <Ionicons name="calendar-outline" size={18} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add" 
            style={[styles.iconButton, { marginLeft: 6 }]} 
            onPress={createNewTrip}
          >
            <Ionicons name="add-circle" size={24} color={Colors.PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        
        {/* Animated Multi-Trip Slider (when user has trips) */}
        {userTripsList.length > 0 && (
          <Animated.View 
            style={[
              styles.carouselSection, 
              { 
                opacity: carouselFadeAnim, 
                transform: [{ translateX: carouselSlideAnim }] 
              }
            ]}
          >
            <View style={styles.carouselHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="compass-outline" size={16} color={Colors.PRIMARY} style={{ marginRight: 6 }} />
                <Text style={[styles.carouselTitle, { color: theme.text }]}>Your Trips</Text>
                <View style={[styles.tripCountBadge, { backgroundColor: Colors.PRIMARY + "18" }]}>
                  <Text style={[styles.tripCountText, { color: Colors.PRIMARY }]}>{userTripsList.length}</Text>
                </View>
              </View>
              <Text style={[styles.carouselSwipeHint, { color: theme.subtext }]}>Slide to switch ➡️</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
            >
              {userTripsList.map((t, idx) => {
                const isSelected = activeTripId === t.id || (activeTripId === null && idx === 0);
                const destTitle = t.aiTripPlan?.destination || t.destination || t.locationInfo?.name || "Trip";
                const fallbackForCard = getDestinationImage(destTitle);
                const rawImg = t.toLocationImage || t.locationInfo?.photoRef || fallbackForCard;
                const destImg = sanitizeImageUrl(rawImg, fallbackForCard);
                const duration = t.aiTripPlan?.duration || `${t.totalDays || 3} Days`;

                return (
                  <TouchableOpacity
                    key={t.id || idx}
                    activeOpacity={0.85}
                    onPress={() => handleSelectTrip(t)}
                    style={[
                      styles.tripCarouselCard,
                      {
                        borderColor: isSelected ? Colors.PRIMARY : theme.border,
                        borderWidth: isSelected ? 2 : 1,
                        backgroundColor: theme.card,
                      },
                    ]}
                  >
                    <SafeTripImage uri={destImg} style={styles.carouselCardImg} fallbackUri={fallbackForCard} />
                    <View style={styles.carouselOverlay} />

                    <FavoriteHeartButton
                      place={{
                        name: destTitle,
                        tag: t.aiTripPlan?.budget || t.budget || "Trip",
                        img: destImg,
                        desc: `${duration} itinerary in ${destTitle}`,
                      }}
                      size={13}
                      style={{ position: "absolute", top: 8, right: 38, width: 26, height: 26, borderRadius: 13 }}
                    />

                    {isSelected && (
                      <View style={styles.activePill}>
                        <View style={styles.activePillDot} />
                        <Text style={styles.activePillText}>VIEWING</Text>
                      </View>
                    )}

                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete"
                      style={styles.carouselDeleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteTrip(t);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={13} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.carouselCardBody}>
                      <Text style={styles.carouselDestTitle} numberOfLines={1}>{destTitle}</Text>
                      <View style={styles.carouselMetaRow}>
                        <Ionicons name="time-outline" size={11} color="#E2E8F0" />
                        <Text style={styles.carouselMetaText}>{duration}</Text>
                        <Text style={styles.carouselMetaDot}>•</Text>
                        <Ionicons name="wallet-outline" size={11} color="#E2E8F0" />
                        <Text style={styles.carouselMetaText}>{t.aiTripPlan?.budget || t.budget || "Budget"}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Add Trip Quick Card */}
              <TouchableOpacity
                onPress={createNewTrip}
                activeOpacity={0.8}
                style={[styles.addTripCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={[styles.addTripIconWrap, { backgroundColor: Colors.PRIMARY + "15" }]}>
                  <Ionicons name="add" size={24} color={Colors.PRIMARY} />
                </View>
                <Text style={[styles.addTripText, { color: theme.text }]}>New Trip</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        )}

        {/* Hero Banner with Modern Glassmorphism Overlay */}
        <View style={styles.heroContainer}>
          <SafeTripImage 
            uri={tripData?.toLocationImage || tripData?.locationInfo?.photoRef} 
            style={styles.heroImage} 
            fallbackUri={getDestinationImage(plan?.destination || tripData?.locationInfo?.name)}
          />
          <View style={styles.heroGradient} pointerEvents="none" />
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 14,
              right: 60,
              zIndex: 40,
              backgroundColor: isSavedToTripsLocal ? "#10B981" : "rgba(15, 23, 42, 0.75)",
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isSavedToTripsLocal ? "#10B981" : "rgba(255, 255, 255, 0.2)",
            }}
            onPress={handleSaveCurrentTripToUserTrips}
            activeOpacity={0.85}
          >
            <Ionicons name={isSavedToTripsLocal ? "checkmark-circle" : "bookmark"} size={13} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={{ color: "#FFF", fontSize: 11, fontFamily: "Outfit-Bold" }}>
              {isSavedToTripsLocal ? "Saved in Trips ✅" : "Save to Trips"}
            </Text>
          </TouchableOpacity>
          <FavoriteHeartButton
            place={{
              name: plan?.destination || tripData?.locationInfo?.name || "Destination",
              tag: plan?.budget || "Trip Destination",
              img: sanitizeImageUrl(
                tripData?.toLocationImage || tripData?.locationInfo?.photoRef,
                getDestinationImage(plan?.destination || tripData?.locationInfo?.name)
              ),
              desc: `${plan?.duration || "Multi-Day"} curated itinerary in ${plan?.destination || "Destination"}`,
            }}
            size={18}
            style={{ position: "absolute", top: 14, right: 14, width: 38, height: 38, borderRadius: 19, zIndex: 50 }}
          />
          
          <View style={styles.heroGlassCard}>
            <View style={styles.badgeRow}>
              {/* Offline Ready Badge */}
              <View style={[styles.glassBadge, styles.offlineReadyBadge]}>
                <Ionicons name="flash" size={12} color="#A7F3D0" />
                <Text style={[styles.glassBadgeText, { color: "#A7F3D0", fontFamily: "Outfit-Bold" }]}>Offline Ready</Text>
              </View>
              <View style={styles.glassBadge}>
                <Ionicons name="time-outline" size={13} color="#FFF" />
                <Text style={styles.glassBadgeText}>{plan.duration || "Multi-Day"}</Text>
              </View>
              <View style={styles.glassBadge}>
                <Ionicons name="wallet-outline" size={13} color="#FFF" />
                <Text style={styles.glassBadgeText}>{plan.budget || "Budget"}</Text>
              </View>
              <View style={styles.glassBadge}>
                <Ionicons name="people-outline" size={13} color="#FFF" />
                <Text style={styles.glassBadgeText}>{plan.traveler || "Traveler"}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.glassBadge, { backgroundColor: "rgba(139, 92, 246, 0.45)", borderColor: "#C4B5FD", borderWidth: 0.8 }]}
                onPress={handleSaveToBookings}
                activeOpacity={0.8}
              >
                <Ionicons name="ticket-outline" size={12} color="#EDE9FE" />
                <Text style={[styles.glassBadgeText, { color: "#EDE9FE", fontFamily: "Outfit-Bold" }]}>Save to Bookings</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.glassBadge, { backgroundColor: "rgba(16, 185, 129, 0.45)", borderColor: "#6EE7B7", borderWidth: 0.8 }]}
                onPress={handleDirectDownloadPDF}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={12} color="#D1FAE5" />
                <Text style={[styles.glassBadgeText, { color: "#D1FAE5", fontFamily: "Outfit-Bold" }]}>Download PDF</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.heroDestTitle}>{plan.destination}</Text>
            {plan?.qualityAudit?.noulConfidence != null && (
              <View
                style={[
                  styles.glassBadge,
                  { alignSelf: "flex-start", marginTop: 8, backgroundColor: "rgba(16, 185, 129, 0.45)", borderColor: "#6EE7B7", borderWidth: 0.8 },
                ]}
              >
                <Ionicons name="shield-checkmark" size={12} color="#D1FAE5" />
                <Text style={[styles.glassBadgeText, { color: "#D1FAE5", fontFamily: "Outfit-Bold" }]}>
                  AI Verified · {Math.round(plan.qualityAudit.noulConfidence * 100)}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Live Weather & Smart Wardrobe Card */}
        <WeatherCard 
          weatherBrief={plan?.weatherBrief} 
          destination={plan?.destination || tripData?.toLocation?.name || ""}
        />

        {/* Proactive Smart Travel Advisory Banner (Controlled by User in Profile) */}
        {preferences?.notifications && showNotificationBanner && (
          <View style={[styles.notificationCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.notificationIconWrap}>
              <Ionicons name="sparkles" size={18} color={Colors.PRIMARY} />
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.notificationTitleRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={[styles.notificationTitle, { color: theme.text }]}>
                    Smart Trip Advisory
                  </Text>
                  <View style={styles.liveIndicatorDot} />
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close"
                  onPress={() => setShowNotificationBanner(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color={theme.subtext} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.notificationMessage, { color: theme.subtext }]}>
                {plan?.weatherBrief 
                  ? `Forecast: ${plan.weatherBrief.split('.')[0]}. Don't forget your packing essentials before departure!`
                  : `All set for ${plan?.destination}! Review your digital passes and luggage checklist.`}
              </Text>
              <View style={styles.notificationActionsRow}>
                <TouchableOpacity
                  style={styles.notificationLinkBtn}
                  onPress={() => router.push("/(tabs)/profile")}
                >
                  <Ionicons name="notifications-outline" size={13} color={Colors.PRIMARY} />
                  <Text style={[styles.notificationLinkText, { color: Colors.PRIMARY }]}>
                    Manage in Profile
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.notificationLinkBtn, { marginLeft: 14 }]}
                  onPress={() => router.push("/packing-checklist")}
                >
                  <Ionicons name="bag-check-outline" size={13} color="#10B981" />
                  <Text style={[styles.notificationLinkText, { color: "#10B981" }]}>
                    Review Packing
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Quick Action Bar (Calendar, Packing, Share & Clone, PDF Export, Expenses, Safety) */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ marginBottom: 20 }}
          contentContainerStyle={{ gap: 10, paddingRight: 4 }}
        >
          <TouchableOpacity 
            style={[
              styles.quickActionBtn, 
              { backgroundColor: isSavedToTripsLocal ? "rgba(16, 185, 129, 0.15)" : theme.card, borderWidth: 1, borderColor: isSavedToTripsLocal ? "#10B981" : theme.border }
            ]} 
            onPress={handleSaveCurrentTripToUserTrips}
          >
            <Ionicons name={isSavedToTripsLocal ? "checkmark-circle" : "bookmark"} size={17} color={isSavedToTripsLocal ? "#10B981" : Colors.PRIMARY} />
            <Text style={[styles.quickActionLabel, { color: isSavedToTripsLocal ? "#10B981" : theme.text }]}>
              {isSavedToTripsLocal ? "Saved in Trips ✅" : "Save to Trips"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.quickActionBtn, 
              { backgroundColor: "rgba(10, 126, 164, 0.14)", borderWidth: 1, borderColor: "rgba(10, 126, 164, 0.35)" }
            ]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setSelectedDayForRoute(
                daysList[0] || {
                  day: 1,
                  theme: `${plan?.destination || "Destination"} Highlights`,
                  activities: [{ placeName: plan?.destination || "City Center", time: "09:00 AM", details: "Main sightseeing route" }],
                }
              );
            }}
          >
            <Ionicons name="navigate-circle" size={18} color={Colors.PRIMARY} />
            <Text style={[styles.quickActionLabel, { color: Colors.PRIMARY, fontFamily: "Outfit-Bold" }]}>
              Live Routes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.card }]} 
            onPress={addToCalendar}
          >
            <Ionicons name="calendar" size={17} color="#0284C7" />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Add Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.card }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/packing-checklist");
            }}
          >
            <Ionicons name="bag-check" size={17} color="#8B5CF6" />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Packing List</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.card }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowShareModal(true);
            }}
          >
            <Ionicons name="share-social" size={17} color="#0EA5E9" />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Share / Clone</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.card }]} 
            onPress={handleDirectDownloadPDF}
          >
            <Ionicons name="download" size={17} color="#10B981" />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Download PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.card }]} 
            onPress={handleSaveToBookings}
          >
            <Ionicons name="ticket" size={17} color="#8B5CF6" />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Save to Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.card }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowExpenseModal(true);
            }}
          >
            <Ionicons name="wallet" size={17} color="#F59E0B" />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>
              {tripData?.expenses?.length > 0 ? `Expenses (${tripData.expenses.length})` : "Expenses"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.card }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/safety-alerts");
            }}
          >
            <Ionicons name="shield-checkmark" size={17} color="#EF4444" />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Live Safety</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.card }]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowVaultModal(true);
            }}
          >
            <Ionicons name="shield-checkmark" size={17} color="#10B981" />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Offline Vault</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Destination Essentials (Visa, Emergency, Money & Events) */}
        {essentials && (
          <View style={[styles.sectionCard, { backgroundColor: theme.card, marginTop: 14 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[styles.iconCircle, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
                  <Ionicons name="compass" size={18} color={Colors.PRIMARY} />
                </View>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>🧭 Destination Essentials</Text>
                  <Text style={{ fontSize: 11, color: theme.subtext, fontFamily: "Outfit-Medium" }}>
                    Live Travel & Safety Intel
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(13, 148, 136, 0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                <Ionicons name="shield-checkmark" size={12} color="#0D9488" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#0D9488" }}>Verified Intel</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {/* Visa */}
              {essentials.visa && (
                <View style={{ flex: 1, minWidth: "45%", backgroundColor: theme.isDark ? "#252525" : "#F8FAFC", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Ionicons name="card-outline" size={15} color="#0EA5E9" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#0EA5E9" }}>VISA & ENTRY</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: theme.text }} numberOfLines={1}>
                    {typeof essentials.visa === "string" ? "Visa Guidelines" : essentials.visa.visa_required || "Passport required"}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: theme.subtext, marginTop: 2 }} numberOfLines={2}>
                    {typeof essentials.visa === "string" ? essentials.visa.replace(/\*\*/g, "").replace(/^🛂\s*/, "") : essentials.visa.notes || "Check validity."}
                  </Text>
                </View>
              )}

              {/* Currency */}
              {essentials.currency && (
                <View style={{ flex: 1, minWidth: "45%", backgroundColor: theme.isDark ? "#252525" : "#F8FAFC", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Ionicons name="cash-outline" size={15} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#10B981" }}>MONEY & TIPPING</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: theme.text }} numberOfLines={1}>
                    {typeof essentials.currency === "string" ? "Payments" : essentials.currency.currency_code ? `${essentials.currency.currency_code} · ${essentials.currency.card_vs_cash || "Cards accepted"}` : "Cash & Cards"}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: theme.subtext, marginTop: 2 }} numberOfLines={2}>
                    {typeof essentials.currency === "string" ? essentials.currency.replace(/\*\*/g, "").replace(/^💳\s*/, "") : essentials.currency.tipping || "10% tip standard."}
                  </Text>
                </View>
              )}

              {/* Emergency */}
              {essentials.emergency && (
                <View style={{ flex: 1, minWidth: "45%", backgroundColor: theme.isDark ? "#252525" : "#F8FAFC", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Ionicons name="call-outline" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#EF4444" }}>EMERGENCY</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: theme.text }} numberOfLines={1}>
                    {typeof essentials.emergency === "string" ? "Hotlines" : `Police: ${essentials.emergency.police || "911"} · Amb: ${essentials.emergency.ambulance || "911"}`}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: theme.subtext, marginTop: 2 }} numberOfLines={2}>
                    {typeof essentials.emergency === "string" ? essentials.emergency.replace(/\*\*/g, "").replace(/^🚨\s*/, "") : `General: ${essentials.emergency.general || "112"}`}
                  </Text>
                </View>
              )}

              {/* Season */}
              {(essentials.events || (essentials.seasonal_events && essentials.seasonal_events.length > 0)) && (
                <View style={{ flex: 1, minWidth: "45%", backgroundColor: theme.isDark ? "#252525" : "#F8FAFC", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Ionicons name="calendar-outline" size={15} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#F59E0B" }}>SEASON</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: theme.text }} numberOfLines={1}>
                    {typeof essentials.events === "string" ? "Highlights" : `${essentials.seasonal_events[0].event}`}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: theme.subtext, marginTop: 2 }} numberOfLines={2}>
                    {typeof essentials.events === "string" ? essentials.events.replace(/\*\*/g, "").replace(/^🎉\s*/, "") : essentials.seasonal_events[0].highlights || "Great regional weather."}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Visual Trip Cost Breakdown Bar */}
        {plan && (
          <View style={[styles.section, { backgroundColor: theme.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 20 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="pie-chart-outline" size={17} color={Colors.PRIMARY} />
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: theme.text }}>Trip Cost Breakdown</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: "Outfit-Medium", color: Colors.PRIMARY }}>
                {plan.budget || "Moderate Tier"}
              </Text>
            </View>

            {/* Proportional Segmented Progress Bar */}
            <View style={{ height: 10, width: "100%", flexDirection: "row", borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
              <View style={{ flex: 45, backgroundColor: "#3B82F6" }} />
              <View style={{ flex: 32, backgroundColor: "#10B981" }} />
              <View style={{ flex: 23, backgroundColor: "#F59E0B" }} />
            </View>

            {/* Legend with realistic estimated allocations */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6" }} />
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: theme.subtext }}>
                  🏨 Stays ~45%
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" }} />
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: theme.subtext }}>
                  ✈️ Transport ~32%
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B" }} />
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: theme.subtext }}>
                  🍽️ Dining & Sightseeing ~23%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 1. FIRST: Recommended Hotels Section */}
        {plan.hotels?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.mainSectionTitle, { color: theme.text }]}>🏨 Recommended Stays</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>{plan.hotels.length} options</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {plan.hotels.map((hotel, idx) => (
                <View key={idx} style={[styles.hotelCard, { backgroundColor: theme.card }]}>
                  <View style={styles.hotelImageWrap}>
                    <SafeTripImage 
                      uri={hotel.image || hotelPhotos[hotel.name] || getDestinationImage(plan?.destination)} 
                      style={styles.hotelImage} 
                      fallbackUri={getDestinationImage(plan?.destination)}
                    />
                    <FavoriteHeartButton
                      place={{
                        name: hotel.name,
                        tag: `Hotel • ${plan?.destination || "Stay"}`,
                        img: sanitizeImageUrl(hotel.image || hotelPhotos[hotel.name], getDestinationImage(plan?.destination)),
                        desc: hotel.address || hotel.details || `Recommended stay in ${plan?.destination || "destination"}`,
                      }}
                      size={15}
                      style={{ position: "absolute", bottom: 10, left: 10, width: 30, height: 30, borderRadius: 15 }}
                    />
                    <View style={styles.hotelRatingPill}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.hotelRatingText}>{hotel.rating || "4.8"}</Text>
                    </View>
                    <View style={styles.hotelPricePill}>
                      <Text style={styles.hotelPriceText}>
                        {hotelPriceLabel(hotel.price, preferences?.currency)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.hotelBody}>
                    <Text style={[styles.hotelName, { color: theme.text }]} numberOfLines={1}>{hotel.name}</Text>
                    <Text style={[styles.hotelAddress, { color: theme.subtext }]} numberOfLines={1}>
                      {hotel.address || hotel.details || "Convenient location"}
                    </Text>

                    {/* Direct Booking.com Action Button */}
                    <TouchableOpacity 
                      style={styles.hotelBookBtn}
                      onPress={() => openBookingCom(hotel.name)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="bed" size={13} color="#FFF" style={{ marginRight: 5 }} />
                      <Text style={styles.hotelBookBtnText}>Book on Booking.com</Text>
                      <Ionicons name="open-outline" size={12} color="#93C5FD" style={{ marginLeft: 5 }} />
                    </TouchableOpacity>

                    <View style={styles.hotelButtonRow}>
                      <TouchableOpacity 
                        style={styles.hotelMapBtn}
                        onPress={() => openInMaps(hotel)}
                      >
                        <Ionicons name="location-outline" size={14} color={Colors.PRIMARY} />
                        <Text style={styles.hotelMapBtnText}>Map</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.hotelMapBtn, { backgroundColor: "rgba(16, 185, 129, 0.12)", marginLeft: 8 }]}
                        onPress={() => getDirectDirections(hotel)}
                      >
                        <Ionicons name="navigate-outline" size={14} color="#10B981" />
                        <Text style={[styles.hotelMapBtnText, { color: "#10B981" }]}>Directions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 2. SECOND: Outbound & Return Flight Logistics (Departure Day & Return Day) */}
        {(() => {
          const originName =
            plan?.flights?.origin ||
            plan?.origin ||
            tripData?.fromLocation?.name?.split(",")[0]?.trim() ||
            preferences?.originCountry ||
            "Home Airport";
          const destName =
            plan?.flights?.destination ||
            plan?.destination ||
            tripData?.toLocation?.name?.split(",")[0]?.trim() ||
            "Destination";
          const numDays = daysList.length || parseInt(plan?.duration, 10) || 3;
          const rawTier = plan?.budget || tripData?.budget || "Moderate";
          const flightInfo = buildFlightItinerary({
            origin: originName,
            destination: destName,
            startDate: tripData?.startDate,
            endDate: tripData?.endDate,
            days: numDays,
            budget: rawTier,
            existingFlights: plan?.flights,
          });
          const flightPrice = convertPriceString(flightInfo.price, preferences?.currency);

          return (
            <View style={[styles.sectionCard, { backgroundColor: theme.card, marginTop: 18 }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconCircle, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
                  <Ionicons name="airplane" size={18} color={Colors.PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    ✈️ Outbound & Return Flights
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.subtext, fontFamily: "Outfit-Medium", marginTop: 1 }}>
                    {flightInfo.airline} • {flightInfo.cabinClass}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "rgba(10, 126, 164, 0.12)",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: Colors.PRIMARY }}>
                    {flightInfo.originIata} ⇄ {flightInfo.destIata}
                  </Text>
                </View>
              </View>

              {/* Outbound Flight Row (Departure Day) */}
              <View
                style={{
                  backgroundColor: theme.isDark ? "#222230" : "#F8FAFC",
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: Colors.PRIMARY,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: Colors.PRIMARY, textTransform: "uppercase" }}>
                    🛫 Going • Day 1 ({flightInfo.departureDate})
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: theme.subtext }}>
                    Flight {flightInfo.outboundFlightNo} • {flightInfo.duration}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: theme.text, marginTop: 4 }}>
                  {flightInfo.origin} ({flightInfo.originIata}) ✈️ {flightInfo.destination} ({flightInfo.destIata})
                </Text>
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: theme.subtext, marginTop: 2 }}>
                  {flightInfo.outboundDepTime} ──({flightInfo.stops})──► {flightInfo.outboundArrTime} • {flightInfo.originAirport}
                </Text>
              </View>

              {/* Return Flight Row (Return Day) */}
              <View
                style={{
                  backgroundColor: theme.isDark ? "#222230" : "#F8FAFC",
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: "#10B981",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#10B981", textTransform: "uppercase" }}>
                    🛬 Returning • Day {numDays} ({flightInfo.returnDate})
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: theme.subtext }}>
                    Flight {flightInfo.returnFlightNo} • {flightInfo.duration}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: theme.text, marginTop: 4 }}>
                  {flightInfo.destination} ({flightInfo.destIata}) ✈️ {flightInfo.origin} ({flightInfo.originIata})
                </Text>
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: theme.subtext, marginTop: 2 }}>
                  {flightInfo.returnDepTime} ──({flightInfo.stops})──► {flightInfo.returnArrTime} • 🧳 {flightInfo.baggage}
                </Text>
              </View>

              <View style={[styles.priceRow, { marginTop: 12, flexWrap: "wrap", gap: 8 }]}>
                <Text style={styles.priceTag}>Est. Round-Trip: {flightPrice}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.bookButton, { backgroundColor: "#0284C7" }]}
                    onPress={() => Linking.openURL(flightInfo.skyscannerUrl)}
                  >
                    <Text style={styles.bookButtonText}>Skyscanner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => Linking.openURL(flightInfo.bookingUrl)}
                  >
                    <Text style={styles.bookButtonText}>Google Flights ✈️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })()}

        {/* 3. THIRD: Daily Itinerary Section (Day-by-Day Plans) */}
        <View style={[styles.section, { marginTop: 25 }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.mainSectionTitle, { color: theme.text }]}>🗓️ Daily Schedule</Text>
          </View>

          {/* Sticky Horizontal Day Filter Pills */}
          {daysList.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsScroll}>
              <TouchableOpacity 
                style={[
                  styles.dayTabPill, 
                  selectedDay === "all" ? styles.dayTabActive : { backgroundColor: theme.card }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDay("all");
                }}
              >
                <Text style={[styles.dayTabText, selectedDay === "all" ? styles.dayTabTextActive : { color: theme.text }]}>
                  All Days
                </Text>
              </TouchableOpacity>

              {daysList.map((d, index) => {
                const isActive = String(selectedDay) === String(d.day);
                return (
                  <TouchableOpacity 
                    key={index}
                    style={[
                      styles.dayTabPill, 
                      isActive ? styles.dayTabActive : { backgroundColor: theme.card }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDay(String(d.day));
                    }}
                  >
                    <Text style={[styles.dayTabText, isActive ? styles.dayTabTextActive : { color: theme.text }]}>
                      Day {d.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Activities Timeline */}
          {filteredDays.map((day, i) => (
            <View key={i} style={styles.dayContainer}>
              <View style={[styles.dayCardHeader, { backgroundColor: theme.card, flexWrap: "wrap", gap: 8 }]}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", minWidth: 160, gap: 8 }}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>Day {day.day}</Text>
                  </View>
                  <Text style={[styles.dayThemeText, { color: theme.text }]} numberOfLines={1}>{day.theme}</Text>
                </View>

                {/* Day Action Buttons: + Add Activity, 💳 Log Expense & 🗺️ Route Map */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", width: "100%" }}>
                  <TouchableOpacity 
                    style={styles.dayAddBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDayForAdd(day.day);
                      setShowAddActivityModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={13} color="#FFF" />
                    <Text style={styles.dayAddBtnText}>Add Activity</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.dayExpenseBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTargetDayForExpense(`Day ${day.day}`);
                      setShowExpenseModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="card-outline" size={12} color="#F59E0B" />
                    <Text style={styles.dayExpenseBtnText}>Log Expense</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.dayRouteBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDayForRoute(day);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="map" size={13} color="#FFF" />
                    <Text style={styles.dayRouteBtnText}>Route Map</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.dayRegenBtn, { backgroundColor: regeneratingDay === day.day ? Colors.PRIMARY + "30" : "rgba(139, 92, 246, 0.15)", borderColor: "#8B5CF6" }]}
                    onPress={() => handleRegenerateDay(day.day)}
                    disabled={regeneratingDay === day.day}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name={regeneratingDay === day.day ? "hourglass-outline" : "sparkles"} 
                      size={12} 
                      color="#8B5CF6" 
                    />
                    <Text style={[styles.dayRegenBtnText, { color: "#8B5CF6" }]}>
                      {regeneratingDay === day.day ? "Generating..." : "Regenerate Day"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {day.activities?.map((act, j) => {
                const isLast = j === (day.activities.length - 1);
                const timeLower = (act.time || "").toLowerCase();
                
                // Color badges for Morning / Afternoon / Evening
                let timeColor = "#F59E0B"; // Amber (Morning)
                let timeIcon = "sunny-outline";
                if (timeLower.includes("afternoon")) {
                  timeColor = "#0284C7"; // Sky Blue
                  timeIcon = "partly-sunny-outline";
                } else if (timeLower.includes("evening") || timeLower.includes("night")) {
                  timeColor = "#7C3AED"; // Purple
                  timeIcon = "moon-outline";
                }

                return (
                  <View key={j} style={styles.timelineRow}>
                    <View style={styles.timelineTrack}>
                      <View style={[styles.timelineNode, { borderColor: act.isVisited ? "#10B981" : timeColor, backgroundColor: theme.bg }]}>
                        <View style={[styles.timelineInnerDot, { backgroundColor: act.isVisited ? "#10B981" : timeColor }]} />
                      </View>
                      {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.border || "rgba(150,150,150,0.2)" }]} />}
                    </View>

                    <View style={[styles.activityCard, { backgroundColor: theme.card }, act.isVisited && { opacity: 0.85, borderColor: "#10B98140", borderWidth: 1 }]}>
                      <View style={styles.activityCardHeader}>
                        <TouchableOpacity
                          style={{ flexDirection: "row", alignItems: "center" }}
                          onPress={() => toggleActivityVisited(day.day, j)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={act.isVisited ? "checkmark-circle" : "ellipse-outline"}
                            size={18}
                            color={act.isVisited ? "#10B981" : timeColor}
                            style={{ marginRight: 6 }}
                          />
                          <View style={[styles.timeBadge, { backgroundColor: act.isVisited ? "#10B98118" : `${timeColor}18` }]}>
                            <Text style={[styles.timeBadgeText, { color: act.isVisited ? "#10B981" : timeColor }]}>
                              {act.isVisited ? "Visited" : act.time}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <TouchableOpacity 
                            style={styles.mapQuickBtn}
                            onPress={() => openInMaps(act)}
                          >
                            <Ionicons name="location" size={13} color={Colors.PRIMARY} />
                            <Text style={styles.mapQuickText}>Map</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.mapQuickBtn, { marginLeft: 6 }]}
                            onPress={() => getDirectDirections(act)}
                          >
                            <Ionicons name="navigate" size={13} color="#10B981" />
                            <Text style={[styles.mapQuickText, { color: "#10B981" }]}>Directions</Text>
                          </TouchableOpacity>
                          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete" 
                            style={[styles.mapQuickBtn, { marginLeft: 6, backgroundColor: "transparent", borderWidth: 0 }]}
                            onPress={() => deleteActivityFromDay(day.day, j)}
                          >
                            <Ionicons name="trash-outline" size={14} color={theme.isDark ? "#888" : "#AAA"} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={[styles.activityPlaceName, { color: theme.text }, act.isVisited && { textDecorationLine: "line-through", color: theme.subtext }]}>
                        {act.placeName}
                      </Text>
                      <Text style={[styles.activityDesc, { color: theme.subtext }]}>{act.details}</Text>

                      {act.tickets && (
                        <View style={styles.ticketPill}>
                          <Ionicons name="ticket-outline" size={13} color={Colors.PRIMARY} />
                          <Text style={styles.ticketPillText}>
                            Tickets: {convertPriceString(act.tickets, preferences?.currency)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}


            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.resetPlanBtn} onPress={createNewTrip}>
          <Ionicons name="refresh-outline" size={18} color="#EF4444" />
          <Text style={styles.resetPlanText}>Start a New Travel Plan</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Printable / Formatted Itinerary Modal */}
      <Modal statusBarTranslucent
        visible={showExportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Exported Itinerary</Text>
              <Text style={[styles.modalSub, { color: theme.subtext }]}>Printable & shareable travel document</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" 
              style={styles.modalCloseBtn}
              onPress={() => setShowExportModal(false)}
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.modalDocScroll, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalDocText, { color: theme.text }]}>
              {generateFormattedItinerary()}
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalActionBtn, { backgroundColor: Colors.PRIMARY }]} 
              onPress={() => {
                setShowExportModal(false);
                exportItinerary();
              }}
            >
              <Ionicons name="share-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalActionText}>Share / Print Document</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sleek Magazine-Style Printable PDF Itinerary Modal */}
      <PrintableItineraryModal
        visible={showPrintModal}
        plan={plan}
        destination={plan?.destination || tripData?.destination}
        onClose={() => setShowPrintModal(false)}
        theme={theme}
      />

      {/* Shareable Link & Trip Clone Modal */}
      <ShareTripModal
        visible={showShareModal}
        tripId={activeTripId || "current-trip"}
        destination={plan?.destination || tripData?.destination}
        plan={plan}
        onCloneTrip={handleCloneTrip}
        onClose={() => setShowShareModal(false)}
        theme={theme}
      />

      {/* Interactive Day Route Map Modal */}
      <DayRouteModal
        visible={!!selectedDayForRoute}
        day={selectedDayForRoute}
        allDays={daysList}
        destination={plan?.destination}
        onClose={() => setSelectedDayForRoute(null)}
        theme={theme}
      />

      {/* Trip Budget & Expense Tracker Modal */}
      <ExpenseTrackerModal
        visible={showExpenseModal}
        initialDay={targetDayForExpense}
        expenses={tripData?.expenses || []}
        budgetTier={plan?.budget || tripData?.budget || "Moderate"}
        currency={preferences?.currency || "USD"}
        destination={plan?.destination || tripData?.toLocation?.name || ""}
        origin={plan?.origin || tripData?.fromLocation?.name || preferences?.originCountry || ""}
        onSaveExpenses={handleSaveExpenses}
        onClose={() => setShowExpenseModal(false)}
        theme={theme}
      />

      {/* Add Custom Activity Modal */}
      <AddActivityModal
        visible={showAddActivityModal}
        dayNumber={selectedDayForAdd}
        onClose={() => setShowAddActivityModal(false)}
        onAddActivity={handleAddActivity}
        theme={theme}
      />

      {/* Offline Travel Vault & Emergency Assistance Modal */}
      <OfflineVaultModal
        visible={showVaultModal}
        destination={plan?.destination || tripData?.locationInfo?.name || "Destination"}
        hotels={plan?.hotels || []}
        onClose={() => setShowVaultModal(false)}
        theme={theme}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  backToHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  backToHubText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  title: { fontSize: 22, fontFamily: "Outfit-Bold" },
  subtitle: { fontSize: 13, fontFamily: "Outfit-Medium", marginTop: 1 },
  headerOfflinePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  headerOfflineText: {
    color: "#10B981",
    fontSize: 9.5,
    fontFamily: "Outfit-Bold",
    marginLeft: 2,
  },
  headerActions: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  iconButton: { 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    backgroundColor: "rgba(150, 150, 150, 0.1)", 
    justifyContent: "center", 
    alignItems: "center" 
  },

  // Skeleton Shimmer Styles
  skeletonCard: {
    backgroundColor: "rgba(150, 150, 150, 0.15)",
    borderRadius: 20,
    width: "100%",
  },
  skeletonLine: {
    backgroundColor: "rgba(150, 150, 150, 0.2)",
    borderRadius: 8,
  },

  // Carousel Section Styles
  carouselSection: {
    marginBottom: 16,
  },
  carouselHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  carouselTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  tripCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tripCountText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  carouselSwipeHint: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
  carouselContainer: {
    gap: 12,
    paddingRight: 10,
    paddingVertical: 4,
  },
  tripCarouselCard: {
    width: 170,
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  carouselCardImg: {
    width: "100%",
    height: "100%",
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  activePill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  activePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FFF",
    marginRight: 4,
  },
  activePillText: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  carouselDeleteBtn: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  carouselCardBody: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
  },
  carouselDestTitle: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  carouselMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  carouselMetaText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    marginLeft: 3,
  },
  carouselMetaDot: {
    color: "#94A3B8",
    fontSize: 10,
    marginHorizontal: 4,
  },
  addTripCard: {
    width: 110,
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addTripIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  addTripText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },

  // Hero Section
  heroContainer: {
    height: 240,
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  heroGlassCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  glassBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineReadyBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.35)",
    borderColor: "#10B981",
    borderWidth: 1,
  },
  glassBadgeText: { color: "#FFF", fontSize: 11, fontFamily: "Outfit-Medium", marginLeft: 4 },
  heroDestTitle: { color: '#FFF', fontSize: 23, fontFamily: 'Outfit-Bold' },

  // Quick Action Bar
  quickActionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  quickActionLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    marginLeft: 6,
  },

  // Sections
  section: { marginBottom: 20 },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  mainSectionTitle: { fontSize: 20, fontFamily: 'Outfit-Bold' },
  sectionSubtitle: { fontSize: 13, fontFamily: "Outfit-Medium" },

  sectionCard: { padding: 18, borderRadius: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", marginRight: 10 },
  sectionTitle: { fontSize: 17, fontFamily: 'Outfit-Bold' },
  infoText: { fontSize: 14, fontFamily: 'Outfit-Regular', lineHeight: 21 },
  priceRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 14, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(150,150,150,0.1)' 
  },
  priceTag: { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#10B981' },
  bookButton: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bookButtonText: { color: "#FFF", fontSize: 13, fontFamily: "Outfit-Bold" },

  // In-Trip Expense Snapshot Card
  expenseSnapshotCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  expenseSnapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expenseIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseSnapshotTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  expenseSnapshotSub: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 1,
  },
  logExpenseQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  logExpenseQuickBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    marginLeft: 3,
  },
  expenseNumbersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 8,
  },
  expenseLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  expenseValue: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
    marginTop: 2,
  },
  expenseProgressBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 6,
  },
  expenseProgressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  recentExpensesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  recentExpensesLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
  },
  recentExpenseChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
  },
  recentExpenseChipText: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
  },
  expenseEmptyHint: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    fontStyle: "italic",
    marginTop: 4,
  },

  // Hotel Cards
  hotelCard: { 
    width: 255, 
    borderRadius: 20, 
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  hotelImageWrap: { height: 130, width: "100%", position: "relative" },
  hotelImage: { width: "100%", height: "100%" },
  hotelRatingPill: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  hotelRatingText: { color: "#FFF", fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 3 },
  hotelPricePill: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hotelPriceText: { color: "#FFF", fontSize: 11, fontFamily: "Outfit-Bold" },
  hotelBody: { padding: 12 },
  hotelName: { fontSize: 15, fontFamily: 'Outfit-Bold', marginBottom: 2 },
  hotelAddress: { fontSize: 12, fontFamily: 'Outfit-Regular', marginBottom: 10 },
  hotelBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003580", // Iconic Booking.com Navy
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 8,
  },
  hotelBookBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  hotelButtonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hotelMapBtn: { 
    flex: 1,
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(10, 126, 164, 0.08)"
  },
  hotelMapBtnText: { color: Colors.PRIMARY, fontSize: 11, fontFamily: "Outfit-Medium", marginLeft: 4 },

  // Day Tabs Filter
  dayTabsScroll: { marginBottom: 16 },
  dayTabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  dayTabActive: {
    backgroundColor: Colors.PRIMARY,
  },
  dayTabText: { fontSize: 13, fontFamily: "Outfit-Medium" },
  dayTabTextActive: { color: "#FFF", fontFamily: "Outfit-Bold" },

  // Timeline & Itinerary
  dayContainer: { marginBottom: 22 },
  dayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  dayBadge: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  dayBadgeText: { color: "#FFF", fontSize: 12, fontFamily: "Outfit-Bold" },
  dayThemeText: { fontSize: 15, fontFamily: "Outfit-Bold", flex: 1 },
  dayAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  dayAddBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  dayExpenseBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  dayExpenseBtnText: {
    color: "#F59E0B",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  dayRouteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
  },
  dayRouteBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    marginLeft: 4,
  },
  dayRegenBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.8,
  },
  dayRegenBtnText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    marginLeft: 4,
  },

  timelineRow: { flexDirection: "row", marginBottom: 12 },
  timelineTrack: { width: 26, alignItems: "center" },
  timelineNode: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  timelineInnerDot: { width: 6, height: 6, borderRadius: 3 },
  timelineLine: { width: 2, flex: 1, marginVertical: 2 },

  activityCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  activityCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  timeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  timeBadgeText: { fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 4 },
  mapQuickBtn: { flexDirection: "row", alignItems: "center", padding: 2 },
  mapQuickText: { color: Colors.PRIMARY, fontSize: 11, fontFamily: "Outfit-Bold", marginLeft: 2 },

  activityPlaceName: { fontSize: 15, fontFamily: 'Outfit-Bold', marginBottom: 4 },
  activityDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', lineHeight: 19 },
  ticketPill: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  ticketPillText: { color: Colors.PRIMARY, fontSize: 11, fontFamily: "Outfit-Medium", marginLeft: 4 },

  resetPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginTop: 20,
    marginBottom: 40,
  },
  resetPlanText: { color: "#EF4444", fontSize: 14, fontFamily: "Outfit-Bold", marginLeft: 6 },

  // Printable Itinerary Modal
  modalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Outfit-Bold",
  },
  modalSub: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(150, 150, 150, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalDocScroll: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalDocText: {
    fontFamily: "Courier",
    fontSize: 13,
    lineHeight: 20,
  },
  modalFooter: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  modalActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 16,
  },
  modalActionText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },

  // Proactive Smart Travel Advisory Banner Styles
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  notificationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(10, 126, 164, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  liveIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
    marginLeft: 6,
  },
  notificationMessage: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationActionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationLinkText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    marginLeft: 4,
  },
  addCustomActivityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addCustomActivityText: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
});