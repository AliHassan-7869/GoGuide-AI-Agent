import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { openExternalUrl } from "../../Components/utils/openExternalUrl";
import { directionsUrl, placeUrl, routeUrl } from "../../Components/utils/mapsLinks";
import { useCallback, useContext, useEffect, useState, useRef, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View, Image, Linking, Share, Platform, Animated, Modal, Alert, StatusBar, useWindowDimensions } from "react-native";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import useBackDismiss from "../../hooks/useBackDismiss";
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
import FadeInView from "../../Components/ui/FadeInView";
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

const SECTION_TABS = [
  { id: "overview", label: "Overview", icon: "compass-outline" },
  { id: "schedule", label: "Schedule", icon: "calendar-outline" },
  { id: "stays", label: "Stays", icon: "bed-outline" },
  { id: "flights", label: "Flights", icon: "airplane-outline" },
  { id: "budget", label: "Budget", icon: "wallet-outline" },
];

export default function MyTrip() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { tripData, setTripData, preferences } = useContext(CreateTripContext);
  const theme = useTheme();
  const plan = normalizeTrip(tripData?.aiTripPlan || tripData);
  const daysList = Array.isArray(plan?.itinerary) ? plan.itinerary : [];
  const hotelPhotos = useHotelImages(plan?.hotels, plan?.destination);

  const safeTopPadding = Platform.select({
    android: insets.top + 8,
    ios: Math.max(insets.top, 44),
    default: 16,
  });
  const [loading, setLoading] = useState(false);
  // Opens on Day 1 (one day at a time keeps the page short); "All Days" is still one tap away.
  const [selectedDay, setSelectedDay] = useState(1); // "all" or day number
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  useBackDismiss(showMoreMenu, () => setShowMoreMenu(false));
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
  // Home always opens on the "Plan My Trip" hub (even if a trip was restored from storage).
  // A trip's plan is shown only when the user opens it: a saved trip, My Trips, or a fresh generation
  // (those navigate here with ?view=plan).
  const [showHubView, setShowHubView] = useState(true);
  const routeParams = useLocalSearchParams();
  useFocusEffect(
    useCallback(() => {
      if (routeParams?.view === "plan") {
        setShowHubView(false);
        router.setParams({ view: "" });
      }
    }, [routeParams?.view, router])
  );

  // Section Navigation & Scroll Tracking
  const [activeSection, setActiveSection] = useState("overview"); // overview, schedule, stays, flights, budget
  const sectionPositions = useRef({});
  const dayPositions = useRef({});
  const mainScrollRef = useRef(null);
  const dayScrollRef = useRef(null);

  // Collapsible Card States
  const [weatherCollapsed, setWeatherCollapsed] = useState(true); // summary first; tap to expand
  const [advisoryCollapsed, setAdvisoryCollapsed] = useState(false);
  const [essentialsCollapsed, setEssentialsCollapsed] = useState(false);
  const [expandedEssentials, setExpandedEssentials] = useState({});

  // 5-second Undo Snackbar for deleted activities
  const [undoSnackbar, setUndoSnackbar] = useState(null);
  const [undoCountdown, setUndoCountdown] = useState(5);
  const undoTimerRef = useRef(null);
  const undoIntervalRef = useRef(null);

  // Smooth Shimmer pulse animation for skeleton loading
  const pulseAnim = useMemo(() => new Animated.Value(0.3), []);
  const reduceMotion = useReduceMotion();

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

  // Skeleton pulse: only while loading, stopped on cleanup (no stacked loops), static with reduce-motion.
  useEffect(() => {
    if (!loading || reduceMotion) {
      pulseAnim.setValue(0.6);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 750, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 750, useNativeDriver: Platform.OS !== "web" }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loading, reduceMotion, pulseAnim]);

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

  const proceedCreateNewTrip = () => {
    setTripData({});
    router.push("/create-trip/search-place");
  };

  const createNewTrip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isSavedToTripsLocal && plan) {
      if (Platform.OS === "web") {
        if (window.confirm("Your current itinerary is unsaved. Start a new plan anyway?")) {
          proceedCreateNewTrip();
        }
      } else {
        Alert.alert(
          "Start a New Travel Plan?",
          "Your current itinerary is unsaved. What would you like to do?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Start New Without Saving", style: "destructive", onPress: proceedCreateNewTrip },
            {
              text: "Save to My Trips First",
              onPress: async () => {
                await handleSaveCurrentTripToUserTrips();
                proceedCreateNewTrip();
              },
            },
          ]
        );
      }
    } else {
      proceedCreateNewTrip();
    }
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

  // Remove an activity from day with 5-second Undo grace period
  const deleteActivityFromDay = (dayNumber, activityIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const targetDay = plan?.itinerary?.find((d) => String(d.day) === String(dayNumber));
    const removedActivity = targetDay?.activities?.[activityIndex];
    if (!removedActivity) return;

    // Immediately remove from state
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

    // Setup 5-second undo snackbar timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoSnackbar(null);
    }, 5000);

    setUndoSnackbar({
      dayNumber,
      index: activityIndex,
      activity: removedActivity,
    });
  };

  // Restore deleted activity via Undo button
  const handleUndoDelete = () => {
    if (!undoSnackbar) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const { dayNumber, index, activity } = undoSnackbar;
    const updatedItinerary = plan.itinerary.map((d) => {
      if (String(d.day) === String(dayNumber)) {
        const updatedActivities = [...(d.activities || [])];
        updatedActivities.splice(index, 0, activity);
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
    setUndoSnackbar(null);
  };

  // Countdown effect for Undo snackbar
  useEffect(() => {
    if (undoSnackbar) {
      setUndoCountdown(5);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
      undoIntervalRef.current = setInterval(() => {
        setUndoCountdown((c) => {
          if (c <= 1) {
            clearInterval(undoIntervalRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    }
    return () => {
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, [undoSnackbar]);

  // Native Share Sheet Handler
  const handleNativeShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const destName = plan?.destination || "Trip Destination";
      const duration = plan?.duration || "Multi-Day";
      const shareMessage = `🌟 Check out my ${duration} travel itinerary for ${destName} on GoGuide AI!\n\n` +
        `🏨 Stays: ${plan?.hotels?.length || 0} curated stays\n` +
        `🗓️ Plan: ${daysList.length} days of verified sightseeing\n\n` +
        `Explore on GoGuide AI: https://goguide.ai/trip`;
      await Share.share({
        title: `${duration} in ${destName} • GoGuide AI`,
        message: shareMessage,
      });
    } catch (e) {
      console.warn("Share failed:", e);
    }
  };

  // Smooth Section Scrolling
  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const y = sectionPositions.current[sectionId];
    if (y != null && mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ y: Math.max(0, y - 60), animated: true });
    }
  };

  // Smooth Day Scrolling & Auto-Centering
  const handleSelectDay = (dayNum, chipX = 0) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(String(dayNum));

    if (dayScrollRef.current && chipX > 0) {
      dayScrollRef.current.scrollTo({ x: Math.max(0, chipX - 120), animated: true });
    }

    if (dayNum !== "all") {
      const y = dayPositions.current[dayNum];
      if (y != null && mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ y: Math.max(0, y - 70), animated: true });
      }
    } else {
      const y = sectionPositions.current["schedule"];
      if (y != null && mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ y: Math.max(0, y - 60), animated: true });
      }
    }
  };

  // Main scroll tracker for active section highlight
  const handleMainScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const budgetY = sectionPositions.current["budget"] || Infinity;
    const flightsY = sectionPositions.current["flights"] || Infinity;
    const staysY = sectionPositions.current["stays"] || Infinity;
    const scheduleY = sectionPositions.current["schedule"] || Infinity;

    if (scrollY >= budgetY - 140) {
      if (activeSection !== "budget") setActiveSection("budget");
    } else if (scrollY >= flightsY - 140) {
      if (activeSection !== "flights") setActiveSection("flights");
    } else if (scrollY >= staysY - 140) {
      if (activeSection !== "stays") setActiveSection("stays");
    } else if (scrollY >= scheduleY - 140) {
      if (activeSection !== "schedule") setActiveSection("schedule");
    } else {
      if (activeSection !== "overview") setActiveSection("overview");
    }
  };

  // Budget calculations
  const budgetCalculations = useMemo(() => {
    const numDays = daysList.length || parseInt(plan?.duration, 10) || 3;
    const tier = String(plan?.budget || "Moderate").toLowerCase();

    let dailyRate = 140;
    if (tier.includes("cheap") || tier.includes("economical") || tier.includes("budget")) {
      dailyRate = 70;
    } else if (tier.includes("luxury")) {
      dailyRate = 320;
    }

    const totalEst = dailyRate * numDays;
    const staysAmount = Math.round(totalEst * 0.45);
    const transportAmount = Math.round(totalEst * 0.32);
    const diningAmount = Math.round(totalEst * 0.23);

    const symbol = preferences?.currency === "EUR" ? "€" : preferences?.currency === "GBP" ? "£" : "$";

    return {
      total: `${symbol}${totalEst.toLocaleString()}`,
      stays: `${symbol}${staysAmount.toLocaleString()}`,
      transport: `${symbol}${transportAmount.toLocaleString()}`,
      dining: `${symbol}${diningAmount.toLocaleString()}`,
    };
  }, [plan?.budget, plan?.duration, daysList.length, preferences?.currency]);

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
        <Animated.View style={[styles.skeletonCard, { height: 220, opacity: pulseAnim, marginHorizontal: 16 }]} />

        {/* Skeleton Widgets */}
        <Animated.View style={[styles.skeletonCard, { height: 75, marginTop: 15, opacity: pulseAnim, marginHorizontal: 16 }]} />
        <Animated.View style={[styles.skeletonCard, { height: 110, marginTop: 15, opacity: pulseAnim, marginHorizontal: 16 }]} />

        {/* Skeleton Section Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 25, marginBottom: 12, paddingHorizontal: 16 }}>
          <Animated.View style={[styles.skeletonLine, { width: 150, height: 20, opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonLine, { width: 60, height: 16, opacity: pulseAnim }]} />
        </View>

        {/* Skeleton Hotel Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
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
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
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

  const filteredDays = selectedDay === "all" 
    ? daysList 
    : daysList.filter(d => String(d.day) === String(selectedDay));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: safeTopPadding }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Top Header */}
      <View style={styles.header}>
        {/* minWidth: on narrow phones the action buttons wrap to their own row instead of crushing the title */}
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 6, minWidth: 220 }}>
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
          <TouchableOpacity
            style={[styles.iconButton, isSavedToTripsLocal && { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}
            onPress={handleSaveCurrentTripToUserTrips}
            accessibilityRole="button"
            accessibilityLabel={isSavedToTripsLocal ? "Saved in My Trips" : "Save to My Trips"}
            accessibilityState={{ selected: isSavedToTripsLocal }}
          >
            <Ionicons name={isSavedToTripsLocal ? "bookmark" : "bookmark-outline"} size={20} color={isSavedToTripsLocal ? "#10B981" : theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { marginLeft: 8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMoreMenu(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="More trip actions"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. Sticky Section Nav Bar */}
      <View style={[styles.stickyNavBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stickyNavScroll}
        >
          {SECTION_TABS.map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.stickyNavTab,
                  isActive && [styles.stickyNavTabActive, { backgroundColor: Colors.PRIMARY + "18", borderColor: Colors.PRIMARY }],
                ]}
                onPress={() => scrollToSection(tab.id)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? Colors.PRIMARY : theme.subtext}
                  style={{ marginRight: 5 }}
                />
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[
                    styles.stickyNavTabText,
                    { color: isActive ? Colors.PRIMARY : theme.subtext },
                    isActive && { fontFamily: "Outfit-Bold" },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {/* Right-edge fade: hints that the tab row scrolls (last tab is otherwise cut off on small phones) */}
        <LinearGradient
          pointerEvents="none"
          colors={[theme.bg + "00", theme.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.stickyNavFade}
        />
      </View>

      <ScrollView
        ref={mainScrollRef}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {/* ================= SECTION 1: OVERVIEW ================= */}
        <View onLayout={(e) => { sectionPositions.current.overview = e.nativeEvent.layout.y; }}>
          
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
                style={{ marginHorizontal: -16, overflow: "visible" }}
                contentContainerStyle={[styles.carouselContainer, { paddingVertical: 8, overflow: "visible" }]}
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
                      accessibilityRole="button"
                      accessibilityLabel={`${destTitle}, ${duration}${isSelected ? ", currently viewing" : ""}`}
                      accessibilityState={{ selected: isSelected }}
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
                      <LinearGradient
                        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.9)"]}
                        locations={[0, 0.5, 1]}
                        style={styles.carouselOverlay}
                        pointerEvents="none"
                      />

                      <FavoriteHeartButton
                        place={{
                          name: destTitle,
                          tag: t.aiTripPlan?.budget || t.budget || "Trip",
                          img: destImg,
                          desc: `${duration} itinerary in ${destTitle}`,
                        }}
                        size={16}
                        style={{ position: "absolute", top: 2, right: 46 }}
                      />

                      {isSelected && (
                        <View style={styles.activePill}>
                          <View style={styles.activePillDot} />
                          <Text style={styles.activePillText}>VIEWING</Text>
                        </View>
                      )}

                      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete trip ${destTitle}`}
                        style={styles.carouselDeleteBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteTrip(t);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FFF" />
                      </TouchableOpacity>

                      <View style={styles.carouselCardBody}>
                        <Text style={styles.carouselDestTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>{destTitle}</Text>
                        <View style={styles.carouselMetaRow}>
                          <Ionicons name="time-outline" size={11} color="#E2E8F0" />
                          <Text style={styles.carouselMetaText} maxFontSizeMultiplier={1.3}>{duration}</Text>
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
                  accessibilityRole="button"
                  accessibilityLabel="Create a new trip"
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

          {/* Hero Banner with Gradient Scrim and Max 3 Meta Pills */}
          <FadeInView index={1} style={styles.heroShadowWrap}>
          <View style={styles.heroContainer}>
            <SafeTripImage 
              uri={tripData?.toLocationImage || tripData?.locationInfo?.photoRef} 
              style={styles.heroImage} 
              fallbackUri={getDestinationImage(plan?.destination || tripData?.locationInfo?.name)}
            />
            {/* Bottom Gradient Scrim */}
            <LinearGradient
              colors={["transparent", "rgba(11, 15, 23, 0.4)", "rgba(11, 15, 23, 0.95)"]}
              style={styles.heroScrim}
              pointerEvents="none"
            />

            {/* Favorite & Quick Save Floating Badges */}
            <TouchableOpacity
              style={[
                styles.heroFloatingBookmark,
                isSavedToTripsLocal && { backgroundColor: "#10B981", borderColor: "#10B981" }
              ]}
              onPress={handleSaveCurrentTripToUserTrips}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={isSavedToTripsLocal ? "Saved to trips" : "Save to Trips"}
              accessibilityState={{ selected: !!isSavedToTripsLocal }}
            >
              <Ionicons name={isSavedToTripsLocal ? "checkmark-circle" : "bookmark"} size={13} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={{ color: "#FFF", fontSize: 12, fontFamily: "Outfit-Bold" }} maxFontSizeMultiplier={1.3}>
                {isSavedToTripsLocal ? "Saved" : "Save"}
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
              size={20}
              style={{ position: "absolute", top: 8, right: 8, zIndex: 50 }}
            />
            
            {/* Hero Bottom Overlay: Max 3 Meta Pills + Destination Title */}
            <View style={styles.heroBottomOverlay}>
              <View style={styles.heroMetaPillsRow}>
                {/* Pill 1: Duration */}
                <View style={styles.heroMetaPill}>
                  <Ionicons name="time-outline" size={12} color="#FFF" />
                  <Text style={styles.heroMetaPillText}>{plan.duration || "Multi-Day"}</Text>
                </View>
                {/* Pill 2: Budget */}
                <View style={styles.heroMetaPill}>
                  <Ionicons name="wallet-outline" size={12} color="#FFF" />
                  <Text style={styles.heroMetaPillText}>{plan.budget || "Budget"}</Text>
                </View>
                {/* Pill 3: Traveler */}
                <View style={styles.heroMetaPill}>
                  <Ionicons name="people-outline" size={12} color="#FFF" />
                  <Text style={styles.heroMetaPillText}>{plan.traveler || "Explorer"}</Text>
                </View>
              </View>

              <Text style={styles.heroDestTitle} maxFontSizeMultiplier={1.3}>{plan.destination}</Text>

              {plan?.qualityAudit?.noulConfidence != null && (
                <View style={styles.verifiedAuditBadge}>
                  <Ionicons name="shield-checkmark" size={11} color="#A7F3D0" />
                  <Text style={styles.verifiedAuditText}>
                    AI Verified · {Math.round(plan.qualityAudit.noulConfidence * 100)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
          </FadeInView>

          {/* Collapsible Weather Card */}
          <View style={[styles.collapsibleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setWeatherCollapsed(!weatherCollapsed)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={[styles.collapsibleIconCircle, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
                  <Ionicons name="cloudy-night-outline" size={17} color={Colors.PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.collapsibleTitle, { color: theme.text }]}>Live Destination Weather</Text>
                  <Text style={[styles.collapsibleSub, { color: theme.subtext }]} numberOfLines={1}>
                    {plan?.weatherBrief ? plan.weatherBrief.split(".")[0] : `Forecast & climate for ${plan?.destination || "trip"}`}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={weatherCollapsed ? "chevron-down" : "chevron-up"}
                size={18}
                color={theme.subtext}
              />
            </TouchableOpacity>

            {!weatherCollapsed && (
              <View style={styles.collapsibleBody}>
                <WeatherCard 
                  weatherBrief={plan?.weatherBrief} 
                  destination={plan?.destination || tripData?.toLocation?.name || ""}
                />
              </View>
            )}
          </View>

          {/* Collapsible Smart Trip Advisory Banner */}
          {preferences?.notifications && showNotificationBanner && (
            <View style={[styles.collapsibleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.collapsibleHeader}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
                  onPress={() => setAdvisoryCollapsed(!advisoryCollapsed)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.collapsibleIconCircle, { backgroundColor: "rgba(139, 92, 246, 0.12)" }]}>
                    <Ionicons name="sparkles" size={17} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={[styles.collapsibleTitle, { color: theme.text }]}>Smart Trip Advisory</Text>
                      <View style={styles.liveIndicatorDot} />
                    </View>
                    <Text style={[styles.collapsibleSub, { color: theme.subtext }]}>
                      {advisoryCollapsed ? "Tap to view safety & packing advisory" : "Proactive trip guidance"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => setAdvisoryCollapsed(!advisoryCollapsed)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginRight: 10 }}
                  >
                    <Ionicons name={advisoryCollapsed ? "chevron-down" : "chevron-up"} size={18} color={theme.subtext} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={() => setShowNotificationBanner(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color={theme.subtext} />
                  </TouchableOpacity>
                </View>
              </View>

              {!advisoryCollapsed && (
                <View style={styles.collapsibleBody}>
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
              )}
            </View>
          )}

          {/* Collapsible Destination Essentials (with 3-line preview + Read More) */}
          {essentials && (
            <View style={[styles.collapsibleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setEssentialsCollapsed(!essentialsCollapsed)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={[styles.collapsibleIconCircle, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
                    <Ionicons name="compass" size={17} color={Colors.PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.collapsibleTitle, { color: theme.text }]}>Destination Essentials</Text>
                    <Text style={[styles.collapsibleSub, { color: theme.subtext }]}>Live Travel & Safety Intel</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(13, 148, 136, 0.12)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginRight: 8 }}>
                    <Ionicons name="shield-checkmark" size={11} color="#0D9488" style={{ marginRight: 3 }} />
                    <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: "#0D9488" }}>Verified</Text>
                  </View>
                  <Ionicons name={essentialsCollapsed ? "chevron-down" : "chevron-up"} size={18} color={theme.subtext} />
                </View>
              </TouchableOpacity>

              {!essentialsCollapsed && (
                <View style={[styles.collapsibleBody, { gap: 10 }]}>
                  {/* Visa */}
                  {essentials.visa && (
                    <View style={[styles.essentialSubCard, { backgroundColor: theme.isDark ? "#1E2738" : "#F8FAFC", borderColor: theme.border }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Ionicons name="card-outline" size={14} color="#0EA5E9" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#0EA5E9" }}>VISA & ENTRY</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: theme.text }}>
                        {typeof essentials.visa === "string" ? "Visa Guidelines" : essentials.visa.visa_required || "Passport required"}
                      </Text>
                      {(() => {
                        const fullText = typeof essentials.visa === "string" ? essentials.visa.replace(/\*\*/g, "").replace(/^🛂\s*/, "") : essentials.visa.notes || "Check validity.";
                        const isExpanded = !!expandedEssentials.visa;
                        return (
                          <View>
                            <Text
                              style={[styles.essentialNote, { color: theme.subtext }]}
                              numberOfLines={isExpanded ? undefined : 3}
                            >
                              {fullText}
                            </Text>
                            {fullText.length > 90 && (
                              <TouchableOpacity onPress={() => setExpandedEssentials(p => ({ ...p, visa: !p.visa }))}>
                                <Text style={styles.readMoreText}>{isExpanded ? "Show less" : "Read more"}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* Currency */}
                  {essentials.currency && (
                    <View style={[styles.essentialSubCard, { backgroundColor: theme.isDark ? "#1E2738" : "#F8FAFC", borderColor: theme.border }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Ionicons name="cash-outline" size={14} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#10B981" }}>MONEY & TIPPING</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: theme.text }}>
                        {typeof essentials.currency === "string" ? "Payments" : essentials.currency.currency_code ? `${essentials.currency.currency_code} · ${essentials.currency.card_vs_cash || "Cards accepted"}` : "Cash & Cards"}
                      </Text>
                      {(() => {
                        const fullText = typeof essentials.currency === "string" ? essentials.currency.replace(/\*\*/g, "").replace(/^💳\s*/, "") : essentials.currency.tipping || "10% tip standard.";
                        const isExpanded = !!expandedEssentials.currency;
                        return (
                          <View>
                            <Text
                              style={[styles.essentialNote, { color: theme.subtext }]}
                              numberOfLines={isExpanded ? undefined : 3}
                            >
                              {fullText}
                            </Text>
                            {fullText.length > 90 && (
                              <TouchableOpacity onPress={() => setExpandedEssentials(p => ({ ...p, currency: !p.currency }))}>
                                <Text style={styles.readMoreText}>{isExpanded ? "Show less" : "Read more"}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* Emergency */}
                  {essentials.emergency && (
                    <View style={[styles.essentialSubCard, { backgroundColor: theme.isDark ? "#1E2738" : "#F8FAFC", borderColor: theme.border }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Ionicons name="call-outline" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#EF4444" }}>EMERGENCY</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: theme.text }}>
                        {typeof essentials.emergency === "string" ? "Hotlines" : `Police: ${essentials.emergency.police || "911"} · Amb: ${essentials.emergency.ambulance || "911"}`}
                      </Text>
                      {(() => {
                        const fullText = typeof essentials.emergency === "string" ? essentials.emergency.replace(/\*\*/g, "").replace(/^🚨\s*/, "") : `General: ${essentials.emergency.general || "112"}`;
                        const isExpanded = !!expandedEssentials.emergency;
                        return (
                          <View>
                            <Text
                              style={[styles.essentialNote, { color: theme.subtext }]}
                              numberOfLines={isExpanded ? undefined : 3}
                            >
                              {fullText}
                            </Text>
                            {fullText.length > 90 && (
                              <TouchableOpacity onPress={() => setExpandedEssentials(p => ({ ...p, emergency: !p.emergency }))}>
                                <Text style={styles.readMoreText}>{isExpanded ? "Show less" : "Read more"}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* Season */}
                  {(essentials.events || (essentials.seasonal_events && essentials.seasonal_events.length > 0)) && (
                    <View style={[styles.essentialSubCard, { backgroundColor: theme.isDark ? "#1E2738" : "#F8FAFC", borderColor: theme.border }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Ionicons name="calendar-outline" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: "#F59E0B" }}>SEASON</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: theme.text }}>
                        {typeof essentials.events === "string" ? "Highlights" : `${essentials.seasonal_events[0].event}`}
                      </Text>
                      {(() => {
                        const fullText = typeof essentials.events === "string" ? essentials.events.replace(/\*\*/g, "").replace(/^🎉\s*/, "") : essentials.seasonal_events[0].highlights || "Great regional weather.";
                        const isExpanded = !!expandedEssentials.events;
                        return (
                          <View>
                            <Text
                              style={[styles.essentialNote, { color: theme.subtext }]}
                              numberOfLines={isExpanded ? undefined : 3}
                            >
                              {fullText}
                            </Text>
                            {fullText.length > 90 && (
                              <TouchableOpacity onPress={() => setExpandedEssentials(p => ({ ...p, events: !p.events }))}>
                                <Text style={styles.readMoreText}>{isExpanded ? "Show less" : "Read more"}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

        </View>

        {/* ================= SECTION 2: SCHEDULE (RIGHT AFTER OVERVIEW) ================= */}
        <View 
          onLayout={(e) => { sectionPositions.current.schedule = e.nativeEvent.layout.y; }} 
          style={[styles.section, { marginTop: 22 }]}
        >
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={[styles.mainSectionTitle, { color: theme.text }]}>🗓️ Daily Schedule</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
                {daysList.length} Days Planned · Tap any day to focus
              </Text>
            </View>
          </View>

          {/* Sticky Horizontal Day Filter Pills (Auto-centering on tap) */}
          {daysList.length > 1 && (
            <ScrollView
              ref={dayScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.dayTabsScroll, { marginHorizontal: -16 }]}
              contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 24 }}
            >
              <TouchableOpacity 
                style={[
                  styles.dayTabPill, 
                  selectedDay === "all" ? styles.dayTabActive : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDay("all");
                  if (dayScrollRef.current) {
                    dayScrollRef.current.scrollTo({ x: 0, animated: true });
                  }
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
                    onLayout={(e) => {
                      dayPositions.current[d.day] = e.nativeEvent.layout.x;
                    }}
                    style={[
                      styles.dayTabPill, 
                      isActive ? styles.dayTabActive : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }
                    ]}
                    onPress={() => handleSelectDay(d.day, dayPositions.current[d.day])}
                  >
                    <Text style={[styles.dayTabText, isActive ? styles.dayTabTextActive : { color: theme.text }]}>
                      Day {d.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Activities Timeline by Day */}
          {filteredDays.map((day, i) => {
            const visitedCount = (day.activities || []).filter(a => a.isVisited).length;
            const totalCount = (day.activities || []).length;
            const progressRatio = totalCount > 0 ? visitedCount / totalCount : 0;
            const estDayCost = Math.round(budgetCalculations.total / (daysList.length || 1));

            return (
              <View key={i} style={styles.dayContainer}>
                {/* Day Header Card */}
                <View style={[styles.dayCardHeader, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                  {/* Row 1: Day Badge, Theme Title & Per-Day Cost Badge */}
                  <View style={styles.dayHeaderTopRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>Day {day.day}</Text>
                      </View>
                      <Text style={[styles.dayThemeText, { color: theme.text }]} numberOfLines={2}>{day.theme}</Text>
                    </View>
                    {estDayCost > 0 ? (
                      <View style={styles.dayCostBadge}>
                        <Text style={styles.dayCostBadgeText}>
                          ~{convertPriceString(`$${estDayCost}`, preferences?.currency)}/day
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Row 2: Progress Track ("X of Y completed") */}
                  <View style={styles.dayProgressRow}>
                    <View style={[styles.dayProgressBarTrack, { backgroundColor: theme.isDark ? "#243044" : "#E2E8F0" }]}>
                      <View style={[styles.dayProgressBarFill, { width: `${progressRatio * 100}%` }]} />
                    </View>
                    <Text style={[styles.dayProgressText, { color: theme.subtext }]}>
                      {visitedCount} of {totalCount} done
                    </Text>
                  </View>

                  {/* Row 3: 3-Button Action Row in ONE Row without wrapping (Route Map [filled teal], Add Activity [outlined], Log Expense [outlined]) */}
                  <View style={styles.dayActionsRow}>
                    {/* Route Map (Primary Filled Teal) */}
                    <TouchableOpacity 
                      style={styles.dayRoutePrimaryBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedDayForRoute(day);
                      }}
                      activeOpacity={0.8}
                    >
                      {width > 360 && <Ionicons name="map" size={13} color="#FFF" style={{ marginRight: 4 }} />}
                      <Text style={styles.dayRoutePrimaryBtnText}>Route Map</Text>
                    </TouchableOpacity>

                    {/* Add Activity (Outlined) */}
                    <TouchableOpacity 
                      style={[styles.dayOutlinedBtn, { borderColor: theme.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedDayForAdd(day.day);
                        setShowAddActivityModal(true);
                      }}
                      activeOpacity={0.8}
                    >
                      {width > 360 && <Ionicons name="add" size={14} color={theme.text} style={{ marginRight: 3 }} />}
                      <Text style={[styles.dayOutlinedBtnText, { color: theme.text }]}>Add Activity</Text>
                    </TouchableOpacity>

                    {/* Log Expense (Outlined) */}
                    <TouchableOpacity 
                      style={[styles.dayOutlinedBtn, { borderColor: theme.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTargetDayForExpense(`Day ${day.day}`);
                        setShowExpenseModal(true);
                      }}
                      activeOpacity={0.8}
                    >
                      {width > 360 && <Ionicons name="card-outline" size={13} color="#F59E0B" style={{ marginRight: 4 }} />}
                      <Text style={[styles.dayOutlinedBtnText, { color: theme.text }]}>Log Expense</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Activities Timeline */}
                {day.activities?.map((act, j) => {
                  const isLast = j === (day.activities.length - 1);
                  const timeLower = (act.time || "").toLowerCase();
                  
                  // Color badges for Morning (Amber), Afternoon (Teal/Sky), Evening (Purple)
                  let periodColor = "#F59E0B"; // Amber
                  if (timeLower.includes("afternoon") || timeLower.includes("12:") || timeLower.includes("13:") || timeLower.includes("14:") || timeLower.includes("15:")) {
                    periodColor = "#0EA5E9"; // Teal/Sky
                  } else if (timeLower.includes("evening") || timeLower.includes("night") || timeLower.includes("17:") || timeLower.includes("18:") || timeLower.includes("19:") || timeLower.includes("20:")) {
                    periodColor = "#8B5CF6"; // Purple
                  }

                  return (
                    <View key={j}>
                      <View style={styles.timelineRow}>
                        {/* Vertical Timeline Track with Numbered Period Node */}
                        <View style={styles.timelineTrack}>
                          <View style={[styles.timelineNumberNode, { borderColor: act.isVisited ? "#10B981" : periodColor, backgroundColor: act.isVisited ? "#10B981" : periodColor }]}>
                            <Text style={styles.timelineNodeNumber}>{j + 1}</Text>
                          </View>
                          {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.border || "rgba(150,150,150,0.2)" }]} />}
                        </View>

                        {/* Activity Card */}
                        <View style={[
                          styles.activityCard, 
                          { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }, 
                          act.isVisited && { opacity: 0.82, borderColor: "#10B98140" }
                        ]}>
                          {/* Top Row: 44px Done Checkbox + Time Badge + 44px Delete Action */}
                          <View style={styles.activityTopRow}>
                            <TouchableOpacity
                              style={styles.doneCheckboxHitArea}
                              onPress={() => toggleActivityVisited(day.day, j)}
                              activeOpacity={0.7}
                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                              accessibilityLabel={act.isVisited ? "Mark not visited" : "Mark visited"}
                            >
                              <Ionicons
                                name={act.isVisited ? "checkmark-circle" : "ellipse-outline"}
                                size={22}
                                color={act.isVisited ? "#10B981" : periodColor}
                              />
                              <View style={[styles.timePill, { backgroundColor: act.isVisited ? "#10B98118" : `${periodColor}18` }]}>
                                <Text style={[styles.timePillText, { color: act.isVisited ? "#10B981" : periodColor }]}>
                                  {act.time || `Stop ${j + 1}`}
                                </Text>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.activityDeleteBtn}
                              onPress={() => deleteActivityFromDay(day.day, j)}
                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                              accessibilityLabel="Delete Activity"
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash-outline" size={16} color={theme.subtext} />
                            </TouchableOpacity>
                          </View>

                          {/* Activity Title (16px bold) */}
                          <Text style={[
                            styles.activityTitle, 
                            { color: theme.text }, 
                            act.isVisited && { textDecorationLine: "line-through", color: theme.subtext }
                          ]}>
                            {act.placeName}
                          </Text>

                          {/* 2-line Description */}
                          <Text style={[styles.activityDesc, { color: theme.subtext }]} numberOfLines={2}>
                            {act.details}
                          </Text>

                          {/* Compact Meta Row (Tickets / Price pill) */}
                          {act.tickets && (
                            <View style={styles.activityMetaRow}>
                              <View style={[styles.compactMetaPill, { backgroundColor: "rgba(10, 126, 164, 0.1)" }]}>
                                <Ionicons name="ticket-outline" size={12} color={Colors.PRIMARY} />
                                <Text style={styles.compactMetaPillText}>
                                  Tickets: {convertPriceString(act.tickets, preferences?.currency)}
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Bottom Action Row: Directions & Map (44px min touch targets) */}
                          <View style={styles.activityBottomActions}>
                            <TouchableOpacity 
                              style={[styles.activityActionBtn, styles.directionsActionBtn]}
                              onPress={() => getDirectDirections(act)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="navigate-outline" size={14} color="#10B981" />
                              <Text style={[styles.activityActionBtnText, { color: "#10B981" }]}>Directions</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[styles.activityActionBtn, { backgroundColor: "rgba(10, 126, 164, 0.08)", marginLeft: 8 }]}
                              onPress={() => openInMaps(act)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="location-outline" size={14} color={Colors.PRIMARY} />
                              <Text style={[styles.activityActionBtnText, { color: Colors.PRIMARY }]}>Map</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Reserved Travel-Time Slot between activities (ready for Part 4) */}
                      {!isLast && (
                        <View style={styles.travelTimeSlot}>
                          <Ionicons name="time-outline" size={11} color={theme.subtext} />
                          <Text style={[styles.travelTimeSlotText, { color: theme.subtext }]}>
                            ~15-20 min transit
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* ================= SECTION 3: STAYS ================= */}
        {plan.hotels?.length > 0 && (
          <View 
            onLayout={(e) => { sectionPositions.current.stays = e.nativeEvent.layout.y; }} 
            style={[styles.section, { marginTop: 10 }]}
          >
            <View style={styles.sectionTitleRow}>
              <View>
                <Text style={[styles.mainSectionTitle, { color: theme.text }]}>🏨 Recommended Stays</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
                  {plan.hotels.length} verified stays near top attractions
                </Text>
              </View>
            </View>

            {/* Snap Carousel (~85% card width) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={Math.min(340, Math.round(width * 0.82)) + 14}
              decelerationRate="fast"
              style={{ marginTop: 12, marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {plan.hotels.map((hotel, idx) => {
                const cardWidth = Math.min(340, Math.round(width * 0.82));
                const totalStaysEst = parseInt(hotel.price || "120", 10) * (daysList.length || 3);

                return (
                  <View 
                    key={idx} 
                    style={[
                      styles.hotelCard, 
                      { width: cardWidth, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }
                    ]}
                  >
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
                        size={18}
                        style={{ position: "absolute", bottom: 6, left: 6 }}
                      />
                      <View style={styles.hotelRatingPill}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.hotelRatingText}>{hotel.rating || "4.8"}</Text>
                      </View>
                    </View>

                    <View style={styles.hotelBody}>
                      <Text style={[styles.hotelName, { color: theme.text }]} numberOfLines={1}>{hotel.name}</Text>
                      <Text style={[styles.hotelAddress, { color: theme.subtext }]} numberOfLines={1}>
                        {hotel.address || hotel.details || "Central & convenient location"}
                      </Text>

                      {/* Price Per Night + Total Stays in the Same Spot on Every Card */}
                      <View style={styles.hotelPriceContainer}>
                        <Text style={styles.hotelPricePerNight}>
                          {hotelPriceLabel(hotel.price, preferences?.currency)}
                        </Text>
                        <Text style={[styles.hotelPriceTotal, { color: theme.subtext }]}>
                          Est. Total ({daysList.length || 3}N): {convertPriceString(totalStaysEst, preferences?.currency)}
                        </Text>
                      </View>

                      {/* Full-width 44px Button: "Book on Booking.com" + external link icon */}
                      <TouchableOpacity 
                        style={styles.hotelBookBtn}
                        onPress={() => openBookingCom(hotel.name)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="bed" size={14} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.hotelBookBtnText}>Book on Booking.com</Text>
                        <Ionicons name="open-outline" size={13} color="#93C5FD" style={{ marginLeft: 6 }} />
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
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ================= SECTION 4: FLIGHTS ================= */}
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
            <View 
              onLayout={(e) => { sectionPositions.current.flights = e.nativeEvent.layout.y; }} 
              style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, marginTop: 18 }]}
            >
              <View style={styles.sectionHeader}>
                <View style={[styles.iconCircle, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
                  <Ionicons name="airplane" size={18} color={Colors.PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Outbound & Return Flights
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

              {/* Outbound Flight Block (Going • Day 1) */}
              <View style={[styles.flightBlock, { backgroundColor: theme.isDark ? "#1E2738" : "#F8FAFC", borderLeftColor: Colors.PRIMARY }]}>
                <View style={styles.flightBlockHeader}>
                  <Text style={[styles.flightBlockType, { color: Colors.PRIMARY }]}>
                    🛫 GOING • DAY 1 ({flightInfo.departureDate})
                  </Text>
                  <Text style={[styles.flightCodeBadge, { color: theme.subtext }]}>
                    Flight {flightInfo.outboundFlightNo} • {flightInfo.duration}
                  </Text>
                </View>
                <Text style={[styles.flightRouteTitle, { color: theme.text }]}>
                  {flightInfo.origin} ({flightInfo.originIata}) ✈️ {flightInfo.destination} ({flightInfo.destIata})
                </Text>
                <Text style={[styles.flightDetailLine, { color: theme.subtext }]}>
                  {flightInfo.outboundDepTime} ──({flightInfo.stops})──► {flightInfo.outboundArrTime}
                </Text>
                <Text style={[styles.flightAirportLine, { color: theme.subtext }]}>
                  Departing: {flightInfo.originAirport}
                </Text>
              </View>

              {/* Return Flight Block (Returning • Day N) */}
              <View style={[styles.flightBlock, { backgroundColor: theme.isDark ? "#1E2738" : "#F8FAFC", borderLeftColor: "#10B981" }]}>
                <View style={styles.flightBlockHeader}>
                  <Text style={[styles.flightBlockType, { color: "#10B981" }]}>
                    🛬 RETURNING • DAY {numDays} ({flightInfo.returnDate})
                  </Text>
                  <Text style={[styles.flightCodeBadge, { color: theme.subtext }]}>
                    Flight {flightInfo.returnFlightNo} • {flightInfo.duration}
                  </Text>
                </View>
                <Text style={[styles.flightRouteTitle, { color: theme.text }]}>
                  {flightInfo.destination} ({flightInfo.destIata}) ✈️ {flightInfo.origin} ({flightInfo.originIata})
                </Text>
                <Text style={[styles.flightDetailLine, { color: theme.subtext }]}>
                  {flightInfo.returnDepTime} ──({flightInfo.stops})──► {flightInfo.returnArrTime}
                </Text>
                <Text style={[styles.flightAirportLine, { color: theme.subtext }]}>
                  Baggage included: 🧳 {flightInfo.baggage}
                </Text>
              </View>

              {/* Live Price Slot (Ready for Part 4 live fare sync) */}
              <View style={styles.livePriceSlot}>
                <Ionicons name="sparkles-outline" size={12} color="#0D9488" />
                <Text style={styles.livePriceSlotText}>Estimated fares · check live prices below</Text>
              </View>

              {/* Price & Booking Callout */}
              <View style={styles.flightPriceCallout}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.priceTag}>Est. Round-Trip: {flightPrice}</Text>
                  <View style={styles.estimatedBadge}>
                    <Text style={styles.estimatedBadgeText}>Estimated</Text>
                  </View>
                </View>

                {/* Equal-Weight Skyscanner / Google Flights Buttons */}
                <View style={styles.flightButtonsRow}>
                  <TouchableOpacity
                    style={[styles.flightActionBtn, { backgroundColor: "#0284C7" }]}
                    onPress={() => Linking.openURL(flightInfo.skyscannerUrl)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="airplane-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.flightActionBtnText}>Skyscanner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.flightActionBtn, { backgroundColor: Colors.PRIMARY }]}
                    onPress={() => Linking.openURL(flightInfo.bookingUrl)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="search-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.flightActionBtnText}>Google Flights</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.flightFootnote, { color: theme.subtext }]}>
                  * Prices are approximate and subject to carrier availability.
                </Text>
              </View>
            </View>
          );
        })()}

        {/* ================= SECTION 5: BUDGET ================= */}
        {plan && (
          <View 
            onLayout={(e) => { sectionPositions.current.budget = e.nativeEvent.layout.y; }} 
            style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, marginTop: 14 }]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="pie-chart-outline" size={18} color={Colors.PRIMARY} />
                <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: theme.text }}>Trip Cost Breakdown</Text>
              </View>
              <View style={{ backgroundColor: "rgba(10, 126, 164, 0.12)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: Colors.PRIMARY }}>
                  {plan.budget || "Moderate Tier"}
                </Text>
              </View>
            </View>

            {/* Total Budget Callout Header */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 24, fontFamily: "Outfit-Bold", color: theme.text }}>
                {budgetCalculations.totalFormatted}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Outfit-Medium", color: theme.subtext, marginTop: 2 }}>
                Estimated total for {daysList.length || 3} days · {plan.traveler || "1 traveler"}
              </Text>
            </View>

            {/* Proportional Segmented Progress Bar */}
            <View style={{ height: 10, width: "100%", flexDirection: "row", borderRadius: 5, overflow: "hidden", marginBottom: 14 }}>
              <View style={{ flex: 45, backgroundColor: "#3B82F6" }} />
              <View style={{ flex: 32, backgroundColor: "#10B981" }} />
              <View style={{ flex: 23, backgroundColor: "#F59E0B" }} />
            </View>

            {/* Detailed Legend: Amounts + Percentages + Total */}
            <View style={{ gap: 8 }}>
              <View style={styles.budgetLegendRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6" }} />
                  <Text style={[styles.budgetLegendLabel, { color: theme.text }]}>🏨 Stays (45%)</Text>
                </View>
                <Text style={[styles.budgetLegendValue, { color: theme.text }]}>
                  {budgetCalculations.staysFormatted}
                </Text>
              </View>

              <View style={styles.budgetLegendRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" }} />
                  <Text style={[styles.budgetLegendLabel, { color: theme.text }]}>✈️ Transport & Flights (32%)</Text>
                </View>
                <Text style={[styles.budgetLegendValue, { color: theme.text }]}>
                  {budgetCalculations.transportFormatted}
                </Text>
              </View>

              <View style={styles.budgetLegendRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B" }} />
                  <Text style={[styles.budgetLegendLabel, { color: theme.text }]}>🍽️ Dining & Activities (23%)</Text>
                </View>
                <Text style={[styles.budgetLegendValue, { color: theme.text }]}>
                  {budgetCalculations.diningFormatted}
                </Text>
              </View>

              <View style={[styles.budgetLegendRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.budgetLegendLabel, { color: theme.text, fontFamily: "Outfit-Bold" }]}>Total Estimated</Text>
                <Text style={[styles.budgetLegendValue, { color: Colors.PRIMARY, fontFamily: "Outfit-Bold" }]}>
                  {budgetCalculations.totalFormatted}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ================= SECTION 6: FOOTER ================= */}
        <TouchableOpacity 
          style={styles.resetPlanBtn} 
          onPress={createNewTrip}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh-outline" size={18} color="#EF4444" />
          <Text style={styles.resetPlanText}>Start a New Travel Plan</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Floating 5-Second Undo Snackbar for Deleted Activities */}
      {undoSnackbar && (
        <Animated.View style={[styles.undoSnackbar, { bottom: insets.bottom + 70 }]}>
          <Text style={styles.undoSnackbarText}>
            Activity deleted ({undoCountdown}s)
          </Text>
          <TouchableOpacity
            style={styles.undoSnackbarBtn}
            onPress={handleUndoDelete}
            activeOpacity={0.8}
          >
            <Text style={styles.undoSnackbarBtnText}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

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

      {/* "More" actions sheet: everything that used to crowd the header and the 8-button grid */}
      <Modal visible={showMoreMenu} transparent animationType="fade" onRequestClose={() => setShowMoreMenu(false)} statusBarTranslucent>
        <View style={styles.moreOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowMoreMenu(false)} accessibilityRole="button" accessibilityLabel="Close menu" />
          <View style={[styles.moreSheet, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: insets.bottom + 12 }]}>
            <View style={[styles.moreHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.moreTitle, { color: theme.text }]}>Trip actions</Text>
            {[
              { icon: "download-outline", label: "Download PDF", color: "#10B981", onPress: handleDirectDownloadPDF },
              { icon: "document-text-outline", label: "Printable itinerary", color: theme.text, onPress: () => setShowExportModal(true) },
              { icon: "share-social-outline", label: "Share trip", color: "#0EA5E9", onPress: handleNativeShare },
              { icon: "calendar-outline", label: "Add to calendar", color: "#0284C7", onPress: addToCalendar },
              { icon: "ticket-outline", label: "Save to My Bookings", color: "#8B5CF6", onPress: handleSaveToBookings },
              { icon: "bag-check-outline", label: "Packing list", color: "#8B5CF6", onPress: () => router.push("/packing-checklist") },
              { icon: "shield-checkmark-outline", label: "Live safety alerts", color: "#EF4444", onPress: () => router.push("/safety-alerts") },
              { icon: "compass-outline", label: "Explore destinations", color: Colors.PRIMARY, onPress: () => router.push("/(tabs)/discover") },
              { icon: "add-circle-outline", label: "Plan a new trip", color: Colors.PRIMARY, onPress: createNewTrip },
              { icon: "trash-outline", label: "Delete this trip", color: "#EF4444", danger: true, onPress: () => handleDeleteTrip(tripData) },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.moreRow, item.danger && { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 4 }]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => {
                  setShowMoreMenu(false);
                  // let the sheet close before opening another modal or navigating
                  setTimeout(() => item.onPress?.(), 150);
                }}
              >
                <Ionicons name={item.icon} size={20} color={item.color} />
                <Text style={[styles.moreRowText, { color: item.danger ? "#EF4444" : theme.text }]} maxFontSizeMultiplier={1.3}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

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
  },
  header: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    rowGap: 8,
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 8 
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
  // Day chips (styles were lost in the Part 2 redesign, so the chips rendered as bare text)
  dayTabsScroll: { marginBottom: 12, flexGrow: 0 },
  dayTabPill: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  dayTabActive: { backgroundColor: Colors.PRIMARY, borderWidth: 1, borderColor: Colors.PRIMARY },
  dayTabText: { fontSize: 14, fontFamily: "Outfit-Medium" },
  dayTabTextActive: { color: "#FFFFFF", fontFamily: "Outfit-Bold" },
  moreOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.55)" },
  moreSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  moreHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 10 },
  moreTitle: { fontSize: 16, fontFamily: "Outfit-Bold", marginBottom: 4, paddingHorizontal: 4 },
  moreRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 48, paddingHorizontal: 4 },
  moreRowText: { fontSize: 15, fontFamily: "Outfit-Medium", flexShrink: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", flexShrink: 0, marginLeft: "auto" },
  iconButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
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
    paddingHorizontal: 16,
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
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  carouselSwipeHint: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
  carouselContainer: {
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  tripCarouselCard: {
    width: 196,
    height: 124,
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
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  carouselDeleteBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
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
    color: "#F1F5F9",
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginLeft: 3,
  },
  carouselMetaDot: {
    color: "#CBD5E1",
    fontSize: 12,
    marginHorizontal: 4,
  },
  addTripCard: {
    width: 110,
    height: 124,
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

  // Sticky Section Nav Bar
  stickyNavBar: {
    borderBottomWidth: 1,
    paddingVertical: 6,
    zIndex: 30,
  },
  stickyNavFade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 40,
  },
  stickyNavScroll: {
    paddingHorizontal: 16,
    paddingRight: 40, // last tab can scroll fully clear of the fade
    gap: 8,
    alignItems: "center",
  },
  stickyNavTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  stickyNavTabActive: {
    borderColor: Colors.PRIMARY,
  },
  stickyNavTabText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },

  // Hero Section
  heroShadowWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 22,
    borderRadius: 24,
    backgroundColor: "#0F172A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  heroContainer: {
    height: 250,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: { width: "100%", height: "100%" },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  heroFloatingBookmark: {
    position: "absolute",
    top: 8,
    right: 60,
    zIndex: 40,
    minHeight: 44,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  heroBottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 8,
  },
  heroMetaPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  heroMetaPillText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  heroDestTitle: {
    color: "#FFF",
    fontSize: 24,
    fontFamily: "Outfit-Bold",
  },
  verifiedAuditBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "rgba(16, 185, 129, 0.35)",
    borderColor: "#10B981",
    borderWidth: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  verifiedAuditText: {
    color: "#D1FAE5",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },

  // Separate Action Row below Hero (Bookings, PDF, Share, Explore)
  heroActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  heroActionBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 5,
  },
  heroActionBtnText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },

  // 2x2 Quick Action Grid
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  quickActionGridBtn: {
    width: "48.2%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  quickActionGridLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },

  // Collapsible Cards
  collapsibleCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collapsibleIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  collapsibleTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  collapsibleSub: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    marginTop: 1,
  },
  collapsibleBody: {
    marginTop: 12,
  },

  // Essentials Sub-Cards with Read More
  essentialSubCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  essentialNote: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    lineHeight: 16,
    marginTop: 3,
  },
  readMoreText: {
    color: Colors.PRIMARY,
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    marginTop: 4,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mainSectionTitle: { fontSize: 20, fontFamily: "Outfit-Bold" },
  sectionSubtitle: { fontSize: 13, fontFamily: "Outfit-Medium", marginTop: 2 },

  sectionCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", marginRight: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Outfit-Bold" },

  // Day Schedule Header
  dayContainer: { marginBottom: 20 },
  dayCardHeader: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    gap: 10,
  },
  dayHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayBadge: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  dayBadgeText: { color: "#FFF", fontSize: 12, fontFamily: "Outfit-Bold" },
  dayThemeText: { fontSize: 15, fontFamily: "Outfit-Bold", flex: 1 },
  dayCostBadge: {
    backgroundColor: "rgba(10, 126, 164, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayCostBadgeText: {
    color: Colors.PRIMARY,
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  dayProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayProgressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  dayProgressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  dayProgressText: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
  },
  dayActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  dayRoutePrimaryBtn: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dayRoutePrimaryBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  dayOutlinedBtn: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dayOutlinedBtnText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },

  // Timeline with Numbered Period Nodes
  timelineRow: { flexDirection: "row", marginBottom: 8 },
  timelineTrack: { width: 32, alignItems: "center" },
  timelineNumberNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  timelineNodeNumber: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 3 },
  travelTimeSlot: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 36,
    marginVertical: 4,
    gap: 4,
  },
  travelTimeSlotText: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    fontStyle: "italic",
  },

  // Activity Card
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
  activityTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  doneCheckboxHitArea: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  timePillText: { fontSize: 11, fontFamily: "Outfit-Bold" },
  activityDeleteBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 4,
  },
  activityTitle: { fontSize: 16, fontFamily: "Outfit-Bold", marginBottom: 4 },
  activityDesc: { fontSize: 13, fontFamily: "Outfit-Regular", lineHeight: 19 },
  activityMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  compactMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  compactMetaPillText: { color: Colors.PRIMARY, fontSize: 11, fontFamily: "Outfit-Medium" },
  activityBottomActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.1)",
  },
  activityActionBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 5,
  },
  directionsActionBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  activityActionBtnText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },

  // Hotel Cards (Snap Carousel ~85% width)
  hotelCard: { 
    borderRadius: 20, 
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  hotelImageWrap: { height: 135, width: "100%", position: "relative" },
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
  hotelBody: { padding: 14 },
  hotelName: { fontSize: 15, fontFamily: "Outfit-Bold", marginBottom: 2 },
  hotelAddress: { fontSize: 12, fontFamily: "Outfit-Regular", marginBottom: 8 },
  hotelPriceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(150, 150, 150, 0.08)",
  },
  hotelPricePerNight: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    color: "#10B981",
  },
  hotelPriceTotal: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
  },
  hotelBookBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003580", // Booking.com Navy
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  hotelBookBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  hotelButtonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hotelMapBtn: { 
    flex: 1,
    minHeight: 44,
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(10, 126, 164, 0.08)"
  },
  hotelMapBtnText: { color: Colors.PRIMARY, fontSize: 12, fontFamily: "Outfit-Medium", marginLeft: 4 },

  // Flight Logistics
  flightBlock: {
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
  },
  flightBlockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flightBlockType: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    textTransform: "uppercase",
  },
  flightCodeBadge: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  flightRouteTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    marginTop: 4,
  },
  flightDetailLine: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    marginTop: 3,
  },
  flightAirportLine: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  livePriceSlot: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 4,
  },
  livePriceSlotText: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
    color: "#0D9488",
  },
  flightPriceCallout: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(150, 150, 150, 0.1)",
  },
  priceTag: { fontSize: 15, fontFamily: "Outfit-Bold", color: "#10B981" },
  estimatedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  estimatedBadgeText: {
    color: "#10B981",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  flightButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  flightActionBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  flightActionBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  flightFootnote: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    fontStyle: "italic",
    marginTop: 8,
  },

  // Budget Breakdown Legend
  budgetLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetLegendLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
  budgetLegendValue: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },

  // 5-Second Floating Undo Snackbar
  undoSnackbar: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#161E2E",
    borderColor: Colors.PRIMARY,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  undoSnackbarText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
  undoSnackbarBtn: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  undoSnackbarBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },

  // Reset Plan Footer
  resetPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    marginHorizontal: 16,
    marginTop: 10,
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