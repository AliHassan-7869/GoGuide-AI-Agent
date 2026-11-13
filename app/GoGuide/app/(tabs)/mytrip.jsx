import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { openExternalUrl } from "../../Components/utils/openExternalUrl";
import { directionsUrl, placeUrl } from "../../Components/utils/mapsLinks";
import { useCallback, useContext, useEffect, useState, useRef, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View, Image, Linking, Share, Platform, Animated, Modal, Alert, useWindowDimensions } from "react-native";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import { useBackDismiss } from "../../hooks/useBackDismiss";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../Configs/FirebaseConfig";
import { collection, query, where, getDocs, orderBy, limit, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import { Colors } from "../../Components/constants/constants";
import { styles } from "../../Components/MyTrips/mytrip.styles";
import { Spacing, Typography, useTheme, Palette } from "../../Components/constants/theme";
import { CreateTripContext } from "../../context/CreateTripContext";
import { Ionicons } from "@expo/vector-icons";
import WeatherCard from "../../Components/MyTrips/WeatherCard";

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
import { saveTripToBookings } from "../../Components/utils/BookingService";
import { buildFallbackDestinationEssentials, fetchDestinationEssentials } from "../../Configs/AiModel";
import { convertPriceString, hotelPriceLabel } from "../../Components/constants/Currency";
import {
  DEFAULT_HD_TRAVEL_IMAGE,
  getDestinationImage,
  sanitizeImageUrl,
} from "../../Components/constants/Destinations";

import { TouchableOpacity } from "../../Components/ui/Touchable";
import EmptyState from "../../Components/ui/EmptyState";
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
  const { width, height } = useWindowDimensions();
  const { tripData, setTripData, preferences } = useContext(CreateTripContext);
  const theme = useTheme();
  const plan = useMemo(() => normalizeTrip(tripData?.aiTripPlan || tripData), [tripData]);
  const rawDaysList = useMemo(
    () => (Array.isArray(plan?.itinerary) ? plan.itinerary : []),
    [plan]
  );
  const requestedDaysCount = Math.max(
    rawDaysList.length,
    parseInt(plan?.duration, 10) || 0,
    parseInt(tripData?.totalNoOfDays, 10) || 0,
    parseInt(tripData?.totalDays, 10) || 0
  );
  const daysList = useMemo(() => {
    if (requestedDaysCount <= rawDaysList.length) return rawDaysList;
    const byDay = new Map();
    rawDaysList.forEach((d, idx) => {
      const num = Number(d?.day) || idx + 1;
      byDay.set(num, { ...d, day: num });
    });
    const list = [];
    for (let d = 1; d <= requestedDaysCount; d++) {
      if (byDay.has(d)) {
        list.push(byDay.get(d));
      } else {
        list.push({
          day: d,
          theme: `Day ${d} Exploration`,
          activities: [],
        });
      }
    }
    return list;
  }, [rawDaysList, requestedDaysCount]);
  const hotelPhotos = useHotelImages(plan?.hotels, plan?.destination);

  const safeTopPadding = Platform.select({
    android: insets.top + 8,
    ios: Math.max(insets.top, 44),
    default: 16,
  });
  const [loading, setLoading] = useState(false);
  // Default to "all" ("All Days"): shows every day's plan stacked in order; tapping a day filters in place.
  const [selectedDay, setSelectedDay] = useState("all"); // "all" or day number string
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  useBackDismiss(showMoreMenu, () => setShowMoreMenu(false));
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const activeDestName = plan?.destination || tripData?.destination || tripData?.toLocation?.name || "";
  const [fetchedEssentials, setFetchedEssentials] = useState(null);
  const fallbackEssentials = useMemo(
    () => (activeDestName ? buildFallbackDestinationEssentials(activeDestName) : null),
    [activeDestName]
  );
  const essentials =
    fetchedEssentials &&
    String(fetchedEssentials.dest).toLowerCase() === String(activeDestName).toLowerCase()
      ? fetchedEssentials.data
      : fallbackEssentials;
  const [, setBookedActivities] = useState({});
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
  const sectionRefs = useRef({});
  const dayPositions = useRef({});
  const dayBarWidthRef = useRef(0);
  const mainScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  const isTabScrollLocked = useRef(false);
  const tabScrollLockTimer = useRef(null);

  const [headerHeight, setHeaderHeight] = useState(60);
  const [navHeight, setNavHeight] = useState(48);
  const SECTION_GAP = 14; // Consistent 12-16px gap below sticky bars

  const dynamicStickyOffset = useMemo(() => {
    return (headerHeight || 56) + (navHeight || 48) + (safeTopPadding || 0) + SECTION_GAP;
  }, [headerHeight, navHeight, safeTopPadding]);

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
  const dayContentFade = useMemo(() => new Animated.Value(1), []);

  // Reset selectedDay to "all" when a different trip is opened (persists across in-trip edits)
  const currentTripKey = `${activeTripId || ""}::${plan?.destination || ""}::${daysList.length}`;
  const prevTripKeyRef = useRef(currentTripKey);
  useEffect(() => {
    if (plan?.destination && prevTripKeyRef.current !== currentTripKey) {
      prevTripKeyRef.current = currentTripKey;
      setSelectedDay("all");
      setExpandedEssentials({});
      if (dayScrollRef.current) {
        dayScrollRef.current.scrollTo({ x: 0, animated: false });
      }
    }
  }, [currentTripKey, plan?.destination]);

  // Slide & Fade animation for multi-trip carousel
  const carouselSlideAnim = useMemo(() => new Animated.Value(-20), []);
  const carouselFadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!activeDestName) return;
    let cancelled = false;
    fetchDestinationEssentials(activeDestName)
      .then((data) => {
        if (data && !cancelled) setFetchedEssentials({ dest: activeDestName, data });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeDestName]);

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
        } catch {}
      }
    });
  }, []);


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
        } catch {}
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
        } catch {}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs on mount only / depends on stable references; adding the flagged dependency would re-run it on every render
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
        } catch {}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs on mount only / depends on stable references; adding the flagged dependency would re-run it on every render
  }, [auth.currentUser]);

  const handleSelectTrip = (selectedTrip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowHubView(false);
    setSelectedDay("all");
    setExpandedEssentials({});
    if (dayScrollRef.current) {
      dayScrollRef.current.scrollTo({ x: 0, animated: false });
    }
    if (selectedTrip?.id) {
      setActiveTripId(selectedTrip.id);
    }
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
      } catch {
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
    const updatedItinerary = daysList.map((d) => {
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

    const targetDay = daysList.find((d) => String(d.day) === String(dayNumber));
    const removedActivity = targetDay?.activities?.[activityIndex];
    if (!removedActivity) return;

    // Immediately remove from state
    const updatedItinerary = daysList.map((d) => {
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

    setUndoCountdown(5);
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
    const updatedItinerary = daysList.map((d) => {
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

  // Compute exact live scroll offset for any section
  const getSectionScrollY = (sectionId) => {
    if (sectionId === "overview") return 0;

    // 1. On Web: measure exact live coordinate relative to scroll container
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const node = sectionRefs.current[sectionId];
      const scrollEl = mainScrollRef.current?.getScrollableNode?.() || mainScrollRef.current;
      if (node && scrollEl && typeof node.getBoundingClientRect === "function") {
        const nodeRect = node.getBoundingClientRect();
        const scrollRect = scrollEl.getBoundingClientRect();
        const liveY = nodeRect.top - scrollRect.top + (scrollEl.scrollTop || 0);
        return Math.max(0, Math.round(liveY - SECTION_GAP));
      }
    }

    // 2. On Native or cached fallback:
    const cachedY = sectionPositions.current[sectionId];
    if (typeof cachedY === "number" && !isNaN(cachedY)) {
      return Math.max(0, Math.round(cachedY - SECTION_GAP));
    }
    return 0;
  };

  // Re-measure section positions on DOM/layout updates (expanding cards, day tabs, image loads)
  const recheckPositions = useCallback(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const scrollEl = mainScrollRef.current?.getScrollableNode?.() || mainScrollRef.current;
      if (scrollEl && typeof scrollEl.getBoundingClientRect === "function") {
        const scrollRect = scrollEl.getBoundingClientRect();
        const scrollTop = scrollEl.scrollTop || 0;
        ["overview", "schedule", "stays", "flights", "budget"].forEach((id) => {
          const node = sectionRefs.current[id];
          if (node && typeof node.getBoundingClientRect === "function") {
            const rect = node.getBoundingClientRect();
            sectionPositions.current[id] = rect.top - scrollRect.top + scrollTop;
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(recheckPositions, 100);
    return () => clearTimeout(timer);
  }, [weatherCollapsed, advisoryCollapsed, essentialsCollapsed, expandedEssentials, selectedDay, hotelPhotos, recheckPositions]);

  // Smooth Section Scrolling
  const scrollToSection = (sectionId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSection(sectionId);

    // Lock activeSection highlight to prevent flickering during the scroll animation
    isTabScrollLocked.current = true;
    if (tabScrollLockTimer.current) clearTimeout(tabScrollLockTimer.current);
    tabScrollLockTimer.current = setTimeout(() => {
      isTabScrollLocked.current = false;
    }, 650);

    const targetY = getSectionScrollY(sectionId);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ y: targetY, animated: !reduceMotion });
    }
  };

  const handleScrollEnd = () => {
    if (isTabScrollLocked.current) {
      if (tabScrollLockTimer.current) clearTimeout(tabScrollLockTimer.current);
      isTabScrollLocked.current = false;
    }
  };

  // Day chip tab selection: filters in-place below the chip row with zero page scroll movement
  const handleSelectDay = (dayValue) => {
    const nextVal = String(dayValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const changed = nextVal !== String(selectedDay);
    setSelectedDay(nextVal);

    // Auto-center the selected chip inside the horizontal chip row only (never scroll mainScrollRef)
    const chipLayout = dayPositions.current[nextVal];
    const barWidth = dayBarWidthRef.current || width;
    if (dayScrollRef.current && chipLayout && typeof chipLayout.x === "number") {
      const targetX = Math.max(0, chipLayout.x + (chipLayout.width || 80) / 2 - barWidth / 2);
      dayScrollRef.current.scrollTo({ x: targetX, animated: !reduceMotion });
    } else if (dayScrollRef.current && nextVal === "all") {
      dayScrollRef.current.scrollTo({ x: 0, animated: !reduceMotion });
    }

    // Subtle 180ms fade on content swap (respecting reduce-motion)
    if (changed) {
      if (reduceMotion) {
        dayContentFade.setValue(1);
      } else {
        dayContentFade.setValue(0);
        Animated.timing(dayContentFade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: Platform.OS !== "web",
        }).start();
      }
    }
  };

  // Main scroll tracker for active section highlight (matches exact same offset line)
  const handleMainScroll = (event) => {
    if (isTabScrollLocked.current) return;

    const scrollY = event.nativeEvent.contentOffset.y;
    const threshold = SECTION_GAP + 20;

    const budgetY = sectionPositions.current["budget"] ?? Infinity;
    const flightsY = sectionPositions.current["flights"] ?? Infinity;
    const staysY = sectionPositions.current["stays"] ?? Infinity;
    const scheduleY = sectionPositions.current["schedule"] ?? Infinity;

    if (scrollY >= budgetY - threshold) {
      if (activeSection !== "budget") setActiveSection("budget");
    } else if (scrollY >= flightsY - threshold) {
      if (activeSection !== "flights") setActiveSection("flights");
    } else if (scrollY >= staysY - threshold) {
      if (activeSection !== "stays") setActiveSection("stays");
    } else if (scrollY >= scheduleY - threshold) {
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
      total: totalEst,
      dailyRate,
      totalFormatted: `${symbol}${totalEst.toLocaleString()}`,
      stays: `${symbol}${staysAmount.toLocaleString()}`,
      staysFormatted: `${symbol}${staysAmount.toLocaleString()}`,
      transport: `${symbol}${transportAmount.toLocaleString()}`,
      transportFormatted: `${symbol}${transportAmount.toLocaleString()}`,
      dining: `${symbol}${diningAmount.toLocaleString()}`,
      diningFormatted: `${symbol}${diningAmount.toLocaleString()}`,
    };
  }, [plan?.budget, plan?.duration, daysList.length, preferences?.currency]);

  // Add custom activity to day
  const handleAddActivity = (dayNumber, newActivity) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updatedItinerary = daysList.map((d) => {
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
      <View
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        style={styles.header}
      >
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
              } catch {}
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
                  <Ionicons name="cloud-done" size={10} color={Palette.success} />
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
            <Ionicons name={isSavedToTripsLocal ? "bookmark" : "bookmark-outline"} size={20} color={isSavedToTripsLocal ? Palette.success : theme.text} />
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
      <View
        onLayout={(e) => setNavHeight(e.nativeEvent.layout.height)}
        style={[styles.stickyNavBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}
      >
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
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 120, 360) }}
      >
        {/* ================= SECTION 1: OVERVIEW ================= */}
        <View
          ref={(el) => { sectionRefs.current.overview = el; }}
          onLayout={(e) => { sectionPositions.current.overview = e.nativeEvent.layout.y; }}
          style={{ scrollMarginTop: dynamicStickyOffset }}
        >
          
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
                        <Ionicons name="trash-outline" size={16} color={Palette.white} />
                      </TouchableOpacity>

                      <View style={styles.carouselCardBody}>
                        <Text style={styles.carouselDestTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>{destTitle}</Text>
                        <View style={styles.carouselMetaRow}>
                          <Ionicons name="time-outline" size={11} color={Palette.slate200} />
                          <Text style={styles.carouselMetaText} maxFontSizeMultiplier={1.3}>{duration}</Text>
                          <Text style={styles.carouselMetaDot}>•</Text>
                          <Ionicons name="wallet-outline" size={11} color={Palette.slate200} />
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
                isSavedToTripsLocal && { backgroundColor: Palette.success, borderColor: Palette.success }
              ]}
              onPress={handleSaveCurrentTripToUserTrips}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={isSavedToTripsLocal ? "Saved to trips" : "Save to Trips"}
              accessibilityState={{ selected: !!isSavedToTripsLocal }}
            >
              <Ionicons name={isSavedToTripsLocal ? "checkmark-circle" : "bookmark"} size={13} color={Palette.white} style={{ marginRight: 4 }} />
              <Text style={{ color: Palette.white, fontSize: 12, fontFamily: "Outfit-Bold" }} maxFontSizeMultiplier={1.3}>
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
                  <Ionicons name="time-outline" size={12} color={Palette.white} />
                  <Text style={styles.heroMetaPillText}>{plan.duration || "Multi-Day"}</Text>
                </View>
                {/* Pill 2: Budget */}
                <View style={styles.heroMetaPill}>
                  <Ionicons name="wallet-outline" size={12} color={Palette.white} />
                  <Text style={styles.heroMetaPillText}>{plan.budget || "Budget"}</Text>
                </View>
                {/* Pill 3: Traveler */}
                <View style={styles.heroMetaPill}>
                  <Ionicons name="people-outline" size={12} color={Palette.white} />
                  <Text style={styles.heroMetaPillText}>{plan.traveler || "Explorer"}</Text>
                </View>
              </View>

              <Text style={styles.heroDestTitle} maxFontSizeMultiplier={1.3}>{plan.destination}</Text>

              {plan?.qualityAudit?.noulConfidence != null && (
                <View style={styles.verifiedAuditBadge}>
                  <Ionicons name="shield-checkmark" size={11} color={Palette.mint} />
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
                    <Ionicons name="sparkles" size={17} color={Palette.purple} />
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
                  <TouchableOpacity accessibilityLabel={advisoryCollapsed ? "Expand travel advisory" : "Collapse travel advisory"}
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
                      <Ionicons name="bag-check-outline" size={13} color={Palette.success} />
                      <Text style={[styles.notificationLinkText, { color: Palette.success }]}>
                        Review Packing
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Collapsible Destination Essentials — Fixed 2x2 Grid */}
          {essentials && (
            <View style={[styles.collapsibleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setEssentialsCollapsed(!essentialsCollapsed)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Destination Essentials"
                accessibilityState={{ expanded: !essentialsCollapsed }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={[styles.collapsibleIconCircle, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
                    <Ionicons name="compass" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.collapsibleTitle, { color: theme.text }]}>Destination Essentials</Text>
                    <Text style={[styles.collapsibleSub, { color: theme.subtext }]}>Live Travel & Safety Intel</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={[
                      styles.verifiedIntelBadge,
                      {
                        backgroundColor: theme.isDark
                          ? "rgba(13, 148, 136, 0.18)"
                          : "rgba(15, 118, 110, 0.10)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={12}
                      color={theme.isDark ? Palette.teal : "#0F766E"}
                      style={{ marginRight: Spacing.xs }}
                    />
                    <Text
                      style={[
                        styles.verifiedIntelText,
                        { color: theme.isDark ? Palette.teal : "#0F766E" },
                      ]}
                      maxFontSizeMultiplier={1.3}
                    >
                      Verified Intel
                    </Text>
                  </View>
                  <Ionicons
                    name={essentialsCollapsed ? "chevron-down" : "chevron-up"}
                    size={18}
                    color={theme.subtext}
                  />
                </View>
              </TouchableOpacity>

              {!essentialsCollapsed && (() => {
                const visaText =
                  typeof essentials.visa === "string"
                    ? essentials.visa.replace(/\*\*/g, "").replace(/^🛂\s*/, "").trim()
                    : essentials.visa?.notes || "Check passport validity and entry requirements before departure.";
                const visaTitle =
                  typeof essentials.visa === "string"
                    ? "Visa Guidelines"
                    : essentials.visa?.visa_required || "Visa Guidelines";

                const currencyText =
                  typeof essentials.currency === "string"
                    ? essentials.currency.replace(/\*\*/g, "").replace(/^[💳💵]\s*/, "").trim()
                    : essentials.currency?.tipping || "Cards accepted at major venues; carry local cash for small purchases.";
                const currencyTitle =
                  typeof essentials.currency === "string"
                    ? "Payments"
                    : essentials.currency?.currency_code
                      ? `${essentials.currency.currency_code} · ${essentials.currency.card_vs_cash || "Cards accepted"}`
                      : "Payments";

                const emergencyText =
                  typeof essentials.emergency === "string"
                    ? essentials.emergency.replace(/\*\*/g, "").replace(/^🚨\s*/, "").trim()
                    : `General emergency hotline: ${essentials.emergency?.general || "112"}`;
                const emergencyTitle =
                  typeof essentials.emergency === "string"
                    ? "Hotlines"
                    : `Police: ${essentials.emergency?.police || "112"} · Amb: ${essentials.emergency?.ambulance || "112"}`;

                const seasonText =
                  typeof essentials.events === "string"
                    ? essentials.events.replace(/\*\*/g, "").replace(/^🎉\s*/, "").trim()
                    : essentials.seasonal_events?.[0]?.highlights || "Favourable regional climate and cultural highlights.";
                const seasonTitle =
                  typeof essentials.events === "string"
                    ? "Highlights"
                    : essentials.seasonal_events?.[0]?.event || "Highlights";

                // Fixed 2x2 Grid order:
                // Row 1: [Visa & Entry]   [Money / Payments]
                // Row 2: [Emergency]      [Season]
                const rows = [
                  [
                    {
                      key: "visa",
                      icon: "card-outline",
                      label: "VISA & ENTRY",
                      color: theme.isDark ? Palette.skyLight : Palette.skyDark,
                      title: visaTitle,
                      text: visaText,
                    },
                    {
                      key: "currency",
                      icon: "cash-outline",
                      label: "MONEY & TIPPING",
                      color: theme.isDark ? Palette.successLight : "#047857",
                      title: currencyTitle,
                      text: currencyText,
                    },
                  ],
                  [
                    {
                      key: "emergency",
                      icon: "call-outline",
                      label: "EMERGENCY",
                      color: theme.isDark ? Palette.dangerLight : Palette.dangerDark,
                      title: emergencyTitle,
                      text: emergencyText,
                    },
                    {
                      key: "events",
                      icon: "calendar-outline",
                      label: "SEASON",
                      color: theme.isDark ? Palette.warningLight : "#B45309",
                      title: seasonTitle,
                      text: seasonText,
                    },
                  ],
                ];

                return (
                  <View style={styles.essentialsGrid}>
                    {rows.map((rowItems, rowIdx) => (
                      <View key={`ess-row-${rowIdx}`} style={styles.essentialsRow}>
                        {rowItems.map((card) => {
                          const isExpanded = !!expandedEssentials[card.key];
                          return (
                            <View
                              key={card.key}
                              style={[
                                styles.essentialSubCard,
                                {
                                  backgroundColor: theme.isDark ? "#1E2738" : theme.bg,
                                  borderColor: theme.border,
                                },
                              ]}
                            >
                              <View>
                                <View style={styles.essentialLabelRow}>
                                  <Ionicons
                                    name={card.icon}
                                    size={14}
                                    color={card.color}
                                    style={{ marginRight: Spacing.xs }}
                                  />
                                  <Text
                                    style={[styles.essentialLabelText, { color: card.color }]}
                                    numberOfLines={1}
                                    maxFontSizeMultiplier={1.3}
                                  >
                                    {card.label}
                                  </Text>
                                </View>
                                <Text
                                  style={[styles.essentialCardTitle, { color: theme.text }]}
                                  numberOfLines={1}
                                  maxFontSizeMultiplier={1.3}
                                >
                                  {card.title}
                                </Text>
                                <Text
                                  style={[styles.essentialNote, { color: theme.subtext }]}
                                  numberOfLines={isExpanded ? undefined : 3}
                                  ellipsizeMode="tail"
                                  maxFontSizeMultiplier={1.3}
                                >
                                  {card.text}
                                </Text>
                              </View>

                              <TouchableOpacity
                                style={styles.readMoreBtn}
                                onPress={() =>
                                  setExpandedEssentials((prev) => ({
                                    ...prev,
                                    [card.key]: !prev[card.key],
                                  }))
                                }
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel={`${isExpanded ? "Show less" : "Read more"} for ${card.title}`}
                                accessibilityState={{ expanded: isExpanded }}
                              >
                                <Text style={[styles.readMoreText, { color: theme.primary }]} maxFontSizeMultiplier={1.3}>
                                  {isExpanded ? "Show less" : "Read more"}
                                </Text>
                                <Ionicons
                                  name={isExpanded ? "chevron-up" : "chevron-down"}
                                  size={13}
                                  color={theme.primary}
                                />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>
          )}

        </View>

        {/* ================= SECTION 2: SCHEDULE (RIGHT AFTER OVERVIEW) ================= */}
        <View 
          ref={(el) => { sectionRefs.current.schedule = el; }}
          onLayout={(e) => { sectionPositions.current.schedule = e.nativeEvent.layout.y; }} 
          style={[styles.section, { marginTop: Spacing.xl, scrollMarginTop: dynamicStickyOffset }]}
        >
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={[styles.mainSectionTitle, { color: theme.text }]}>🗓️ Daily Schedule</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
                {daysList.length} {daysList.length === 1 ? "Day" : "Days"} Planned · Tap any day tab to filter
              </Text>
            </View>
          </View>

          {/* Horizontal Day Filter Tabs (Auto-centers chip horizontally, never scrolls the page) */}
          {daysList.length >= 1 && (
            <ScrollView
              ref={dayScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              accessibilityRole="tablist"
              onLayout={(e) => {
                dayBarWidthRef.current = e.nativeEvent.layout.width;
              }}
              style={[styles.dayTabsScroll, { marginHorizontal: -Spacing.gutter }]}
              contentContainerStyle={styles.dayTabsContent}
            >
              <TouchableOpacity 
                onLayout={(e) => {
                  dayPositions.current.all = {
                    x: e.nativeEvent.layout.x,
                    width: e.nativeEvent.layout.width,
                  };
                }}
                style={[
                  styles.dayTabPill, 
                  selectedDay === "all"
                    ? styles.dayTabActive
                    : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }
                ]}
                onPress={() => handleSelectDay("all")}
                accessibilityRole="tab"
                accessibilityLabel="All Days"
                accessibilityState={{ selected: selectedDay === "all" }}
              >
                <Text
                  style={[
                    styles.dayTabText,
                    selectedDay === "all" ? styles.dayTabTextActive : { color: theme.text },
                  ]}
                  maxFontSizeMultiplier={1.3}
                >
                  All Days
                </Text>
              </TouchableOpacity>

              {daysList.map((d, index) => {
                const isActive = String(selectedDay) === String(d.day);
                return (
                  <TouchableOpacity 
                    key={`day-chip-${d.day || index}`}
                    onLayout={(e) => {
                      dayPositions.current[String(d.day)] = {
                        x: e.nativeEvent.layout.x,
                        width: e.nativeEvent.layout.width,
                      };
                    }}
                    style={[
                      styles.dayTabPill, 
                      isActive
                        ? styles.dayTabActive
                        : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }
                    ]}
                    onPress={() => handleSelectDay(d.day)}
                    accessibilityRole="tab"
                    accessibilityLabel={`Day ${d.day}`}
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text
                      style={[
                        styles.dayTabText,
                        isActive ? styles.dayTabTextActive : { color: theme.text },
                      ]}
                      maxFontSizeMultiplier={1.3}
                    >
                      Day {d.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Activities Timeline by Day (Filtered in place, subtle fade, no page scroll) */}
          <Animated.View
            style={[styles.dayScheduleRegion, { opacity: dayContentFade }]}
            accessibilityLabel={
              selectedDay === "all"
                ? "All days itinerary"
                : `Day ${selectedDay} itinerary`
            }
          >
            {filteredDays.map((day) => {
              const visitedCount = (day.activities || []).filter(a => a.isVisited).length;
              const totalCount = (day.activities || []).length;
              const progressRatio = totalCount > 0 ? visitedCount / totalCount : 0;
              const estDayCost = Math.round(budgetCalculations.total / (daysList.length || 1));

              return (
                <View key={`day-panel-${day.day}`} style={styles.dayContainer}>
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
                      <View style={[styles.dayProgressBarTrack, { backgroundColor: theme.isDark ? "#243044" : Palette.slate200 }]}>
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
                        {width > 360 && <Ionicons name="map" size={13} color={Palette.white} style={{ marginRight: 4 }} />}
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
                        {width > 360 && <Ionicons name="card-outline" size={13} color={Palette.warning} style={{ marginRight: 4 }} />}
                        <Text style={[styles.dayOutlinedBtnText, { color: theme.text }]}>Log Expense</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Activities Timeline or Empty State */}
                  {(!day.activities || day.activities.length === 0) ? (
                    <View
                      style={[
                        styles.emptyDayCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <EmptyState
                        icon="calendar-clear-outline"
                        title="No activities yet"
                        text={`No stops scheduled for Day ${day.day} yet. Add an activity to start building this day's plan.`}
                        actionLabel="Add Activity"
                        onAction={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedDayForAdd(day.day);
                          setShowAddActivityModal(true);
                        }}
                        style={{ paddingVertical: Spacing.xl }}
                      />
                    </View>
                  ) : (
                    day.activities.map((act, j) => {
                      const isLast = j === (day.activities.length - 1);
                      const timeLower = (act.time || "").toLowerCase();
                      
                      // Color badges for Morning (Amber), Afternoon (Teal/Sky), Evening (Purple)
                      let periodColor = Palette.warning; // Amber
                      if (timeLower.includes("afternoon") || timeLower.includes("12:") || timeLower.includes("13:") || timeLower.includes("14:") || timeLower.includes("15:")) {
                        periodColor = Palette.sky; // Teal/Sky
                      } else if (timeLower.includes("evening") || timeLower.includes("night") || timeLower.includes("17:") || timeLower.includes("18:") || timeLower.includes("19:") || timeLower.includes("20:")) {
                        periodColor = Palette.purple; // Purple
                      }

                      return (
                        <View key={j}>
                          <View style={styles.timelineRow}>
                            {/* Vertical Timeline Track with Numbered Period Node */}
                            <View style={styles.timelineTrack}>
                              <View style={[styles.timelineNumberNode, { borderColor: act.isVisited ? Palette.success : periodColor, backgroundColor: act.isVisited ? Palette.success : periodColor }]}>
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
                                  accessibilityRole="checkbox"
                                  accessibilityState={{ checked: !!act.isVisited }}
                                  accessibilityLabel={act.isVisited ? "Mark not visited" : "Mark visited"}
                                >
                                  <Ionicons
                                    name={act.isVisited ? "checkmark-circle" : "ellipse-outline"}
                                    size={22}
                                    color={act.isVisited ? Palette.success : periodColor}
                                  />
                                  <View style={[styles.timePill, { backgroundColor: act.isVisited ? "#10B98118" : `${periodColor}18` }]}>
                                    <Text style={[styles.timePillText, { color: act.isVisited ? Palette.success : periodColor }]}>
                                      {act.time || `Stop ${j + 1}`}
                                    </Text>
                                  </View>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                  style={styles.activityDeleteBtn}
                                  onPress={() => deleteActivityFromDay(day.day, j)}
                                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                  accessibilityRole="button"
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
                                  <Ionicons name="navigate-outline" size={14} color={Palette.success} />
                                  <Text style={[styles.activityActionBtnText, { color: Palette.success }]}>Directions</Text>
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
                    })
                  )}
                </View>
              );
            })}
          </Animated.View>
        </View>

        {/* ================= SECTION 3: STAYS ================= */}
        {plan.hotels?.length > 0 && (
          <View 
            ref={(el) => { sectionRefs.current.stays = el; }}
            onLayout={(e) => { sectionPositions.current.stays = e.nativeEvent.layout.y; }} 
            style={[styles.section, { marginTop: 10, scrollMarginTop: dynamicStickyOffset }]}
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
                        <Ionicons name="star" size={12} color={Palette.gold} />
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
                        <Ionicons name="bed" size={14} color={Palette.white} style={{ marginRight: 6 }} />
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
                          <Ionicons name="navigate-outline" size={14} color={Palette.success} />
                          <Text style={[styles.hotelMapBtnText, { color: Palette.success }]}>Directions</Text>
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
              ref={(el) => { sectionRefs.current.flights = el; }}
              onLayout={(e) => { sectionPositions.current.flights = e.nativeEvent.layout.y; }} 
              style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, marginTop: 18, scrollMarginTop: dynamicStickyOffset }]}
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
                  <Text style={{ fontSize: Typography.sizeSm, fontFamily: "Outfit-Bold", color: Colors.PRIMARY }}>
                    {flightInfo.originIata} ⇄ {flightInfo.destIata}
                  </Text>
                </View>
              </View>

              {/* Outbound Flight Block (Going • Day 1) */}
              <View style={[styles.flightBlock, { backgroundColor: theme.isDark ? "#1E2738" : Palette.slate50, borderLeftColor: Colors.PRIMARY }]}>
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
              <View style={[styles.flightBlock, { backgroundColor: theme.isDark ? "#1E2738" : Palette.slate50, borderLeftColor: Palette.success }]}>
                <View style={styles.flightBlockHeader}>
                  <Text style={[styles.flightBlockType, { color: Palette.success }]}>
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
                    style={[styles.flightActionBtn, { backgroundColor: Palette.skyDark }]}
                    onPress={() => Linking.openURL(flightInfo.skyscannerUrl)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="airplane-outline" size={13} color={Palette.white} style={{ marginRight: 4 }} />
                    <Text style={styles.flightActionBtnText}>Skyscanner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.flightActionBtn, { backgroundColor: Colors.PRIMARY }]}
                    onPress={() => Linking.openURL(flightInfo.bookingUrl)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="search-outline" size={13} color={Palette.white} style={{ marginRight: 4 }} />
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
            ref={(el) => { sectionRefs.current.budget = el; }}
            onLayout={(e) => { sectionPositions.current.budget = e.nativeEvent.layout.y; }} 
            style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, marginTop: 14, scrollMarginTop: dynamicStickyOffset }]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="pie-chart-outline" size={18} color={Colors.PRIMARY} />
                <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: theme.text }}>Trip Cost Breakdown</Text>
              </View>
              <View style={{ backgroundColor: "rgba(10, 126, 164, 0.12)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: Typography.sizeSm, fontFamily: "Outfit-Bold", color: Colors.PRIMARY }}>
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
              <View style={{ flex: 45, backgroundColor: Palette.blue }} />
              <View style={{ flex: 32, backgroundColor: Palette.success }} />
              <View style={{ flex: 23, backgroundColor: Palette.warning }} />
            </View>

            {/* Detailed Legend: Amounts + Percentages + Total */}
            <View style={{ gap: 8 }}>
              <View style={styles.budgetLegendRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.blue }} />
                  <Text style={[styles.budgetLegendLabel, { color: theme.text }]}>🏨 Stays (45%)</Text>
                </View>
                <Text style={[styles.budgetLegendValue, { color: theme.text }]}>
                  {budgetCalculations.staysFormatted}
                </Text>
              </View>

              <View style={styles.budgetLegendRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.success }} />
                  <Text style={[styles.budgetLegendLabel, { color: theme.text }]}>✈️ Transport & Flights (32%)</Text>
                </View>
                <Text style={[styles.budgetLegendValue, { color: theme.text }]}>
                  {budgetCalculations.transportFormatted}
                </Text>
              </View>

              <View style={styles.budgetLegendRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.warning }} />
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
          <Ionicons name="refresh-outline" size={18} color={Palette.danger} />
          <Text style={styles.resetPlanText}>Start a New Travel Plan</Text>
        </TouchableOpacity>

        {/* Dynamic bottom spacer so the last section (Budget) can scroll high enough to reach the top below sticky bars */}
        <View style={{ height: Math.max(140, Math.round((height || 800) * 0.45)) }} pointerEvents="none" />

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
              <Ionicons name="share-outline" size={18} color={Palette.white} style={{ marginRight: 6 }} />
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
              { icon: "download-outline", label: "Download PDF", color: Palette.success, onPress: handleDirectDownloadPDF },
              { icon: "document-text-outline", label: "Printable itinerary", color: theme.text, onPress: () => setShowExportModal(true) },
              { icon: "share-social-outline", label: "Share trip", color: Palette.sky, onPress: handleNativeShare },
              { icon: "calendar-outline", label: "Add to calendar", color: Palette.skyDark, onPress: addToCalendar },
              { icon: "ticket-outline", label: "Save to My Bookings", color: Palette.purple, onPress: handleSaveToBookings },
              { icon: "bag-check-outline", label: "Packing list", color: Palette.purple, onPress: () => router.push("/packing-checklist") },
              { icon: "shield-checkmark-outline", label: "Live safety alerts", color: Palette.danger, onPress: () => router.push("/safety-alerts") },
              { icon: "compass-outline", label: "Explore destinations", color: Colors.PRIMARY, onPress: () => router.push("/(tabs)/discover") },
              { icon: "add-circle-outline", label: "Plan a new trip", color: Colors.PRIMARY, onPress: createNewTrip },
              { icon: "trash-outline", label: "Delete this trip", color: Palette.danger, danger: true, onPress: () => handleDeleteTrip(tripData) },
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
                <Text style={[styles.moreRowText, { color: item.danger ? Palette.danger : theme.text }]} maxFontSizeMultiplier={1.3}>{item.label}</Text>
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
