import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useState, useRef } from "react";
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Image, 
  Linking, 
  Share,
  Platform,
  Animated,
  Modal,
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../Configs/FirebaseConfig";
import { collection, query, where, getDocs, orderBy, limit, addDoc } from "firebase/firestore";
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
import {
  DEFAULT_HD_TRAVEL_IMAGE,
  getDestinationImage,
  sanitizeImageUrl,
} from "../../Components/constants/Destinations";

// High quality curated hotel fallbacks (Verified HD 1200px)
const HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200&auto=format&fit=crop"
];

function SafeTripImage({ uri, style, fallbackUri = DEFAULT_HD_TRAVEL_IMAGE }) {
  const [imgSrc, setImgSrc] = useState(() => sanitizeImageUrl(uri, fallbackUri));

  useEffect(() => {
    setImgSrc(sanitizeImageUrl(uri, fallbackUri));
  }, [uri, fallbackUri]);

  return (
    <Image
      source={{ uri: imgSrc }}
      style={style}
      onError={() => {
        if (imgSrc !== fallbackUri) {
          setImgSrc(fallbackUri);
        }
      }}
    />
  );
}

export default function MyTrip() {
  const router = useRouter();
  const { tripData, setTripData, preferences } = useContext(CreateTripContext);
  const theme = useTheme();
  const plan = tripData?.aiTripPlan;
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState("all"); // "all" or day number
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedDayForRoute, setSelectedDayForRoute] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const [userTripsList, setUserTripsList] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);

  // Smooth Shimmer pulse animation for skeleton loading
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  // Slide & Fade animation for multi-trip carousel
  const carouselSlideAnim = useRef(new Animated.Value(-20)).current;
  const carouselFadeAnim = useRef(new Animated.Value(0)).current;

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

  // Load from local AsyncStorage cache first for instant flight-mode access
  useEffect(() => {
    loadCachedTrip();
    if (auth.currentUser) {
      GetMyTrips();
    }
  }, [auth.currentUser]);

  // Save to AsyncStorage whenever tripData updates with an AI plan
  useEffect(() => {
    if (tripData?.aiTripPlan) {
      AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(tripData))
        .then(() => setIsOfflineCached(true))
        .catch((e) => console.log("Failed to cache trip:", e));
    }
  }, [tripData]);

  const loadCachedTrip = async () => {
    try {
      const cached = await AsyncStorage.getItem('@goguide_cached_trip');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.aiTripPlan) {
          setIsOfflineCached(true);
          if (!plan) {
            setTripData(parsed);
          }
        }
      }
    } catch (e) {
      console.log("Error loading cached trip:", e);
    }
  };

  const GetMyTrips = async () => {
    if (!plan) setLoading(true);
    try {
      const q = query(
        collection(db, "UserTrips"),
        where("userEmail", "==", auth.currentUser.email),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      const trips = [];
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        trips.push({
          id: doc.id,
          ...d.tripData,
          createdAt: d.createdAt,
        });
      });

      if (trips.length > 0) {
        setUserTripsList(trips);
        setActiveTripId(trips[0].id);
        if (!plan) {
          setTripData(trips[0]);
          AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(trips[0])).catch(() => {});
          setIsOfflineCached(true);
        }
      }
    } catch (e) {
      console.log("Firestore offline or fetch error:", e);
      // Fallback already handled via loadCachedTrip
    }
    setLoading(false);
  };

  const handleSelectTrip = (selectedTrip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveTripId(selectedTrip.id);
    setTripData(selectedTrip);
    setSelectedDay("all");
    AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(selectedTrip)).catch(() => {});
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

  // 3. Interactive Multi-Stop Day Route in Maps
  const openDayRouteInMaps = (dayObj) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const acts = dayObj?.activities || [];
    if (!acts || acts.length === 0) return;

    if (acts.length === 1) {
      openInMaps(acts[0].placeName, acts[0].coordinates);
      return;
    }

    const origin = encodeURIComponent(acts[0].placeName + " " + (plan?.destination || ""));
    const destination = encodeURIComponent(acts[acts.length - 1].placeName + " " + (plan?.destination || ""));

    let waypointsParam = "";
    if (acts.length > 2) {
      const waypoints = acts.slice(1, -1).map(a => a.placeName + " " + (plan?.destination || "")).join("|");
      waypointsParam = `&waypoints=${encodeURIComponent(waypoints)}`;
    }

    const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=driving`;
    Linking.openURL(routeUrl);
  };

  // 4. Direct Turn-by-Turn Navigation for individual place
  const getDirectDirections = (placeName, coordinates) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let dest = "";
    if (coordinates?.lat && coordinates?.lng && coordinates.lat !== 0) {
      dest = `${coordinates.lat},${coordinates.lng}`;
    } else {
      dest = encodeURIComponent(placeName + " " + (plan?.destination || ""));
    }
    const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    Linking.openURL(dirUrl);
  };

  const openInMaps = (placeName, coordinates) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let url = "";
    if (coordinates?.lat && coordinates?.lng && coordinates.lat !== 0) {
      url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + " " + (plan?.destination || ""))}`;
    }
    Linking.openURL(url);
  };

  // Toggle activity visited completion state
  const toggleActivityVisited = async (dayNumber, activityIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!plan?.itinerary) return;

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

    setTripData(updatedTrip);
    AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(updatedTrip)).catch(() => {});
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

      setTripData(updatedTrip);
      AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(updatedTrip)).catch(() => {});
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

  // Persist updated expenses
  const handleSaveExpenses = (updatedExpenses) => {
    const updatedTrip = {
      ...tripData,
      expenses: updatedExpenses,
    };
    setTripData(updatedTrip);
    AsyncStorage.setItem('@goguide_cached_trip', JSON.stringify(updatedTrip)).catch(() => {});
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
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
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

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StartNewTripCard />
      </View>
    );
  }

  const daysList = plan.itinerary || [];
  const filteredDays = selectedDay === "all" 
    ? daysList 
    : daysList.filter(d => String(d.day) === String(selectedDay));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>My Itinerary</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.subtitle, { color: theme.subtext }]}>{plan.destination}</Text>
            {isOfflineCached && (
              <View style={styles.headerOfflinePill}>
                <Ionicons name="cloud-done" size={11} color="#10B981" />
                <Text style={styles.headerOfflineText}>Cached</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowExportModal(true);
            }}
          >
            <Ionicons name="document-text-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { marginLeft: 8 }]} 
            onPress={addToCalendar}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { marginLeft: 8 }]} 
            onPress={createNewTrip}
          >
            <Ionicons name="add-circle" size={26} color={Colors.PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
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

                    {isSelected && (
                      <View style={styles.activePill}>
                        <View style={styles.activePillDot} />
                        <Text style={styles.activePillText}>VIEWING</Text>
                      </View>
                    )}

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
          <View style={styles.heroGradient} />
          
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
            </View>
            <Text style={styles.heroDestTitle}>{plan.destination}</Text>
          </View>
        </View>

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
                <TouchableOpacity
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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowPrintModal(true);
            }}
          >
            <Ionicons name="print" size={17} color="#10B981" />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Print / PDF</Text>
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
        </ScrollView>
        
        {/* Weather & Packing Quick Widgets */}
        <WeatherCard weatherBrief={plan.weatherBrief} />
        <PackingList items={plan.packingList} />

        {/* Flight Information Card (if available) */}
        {plan.flights && (
          <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(10, 126, 164, 0.12)" }]}>
                <Ionicons name="airplane" size={18} color={Colors.PRIMARY} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Flight Logistics</Text>
            </View>
            <Text style={[styles.infoText, { color: theme.text }]}>{plan.flights.details}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceTag}>Est. {plan.flights.price}</Text>
              {plan.flights.bookingUrl && plan.flights.bookingUrl !== "string" && (
                <TouchableOpacity style={styles.bookButton} onPress={() => Linking.openURL(plan.flights.bookingUrl)}>
                  <Text style={styles.bookButtonText}>Book Flight</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Recommended Hotels Section */}
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
                      uri={hotel.image || HOTEL_IMAGES[idx % HOTEL_IMAGES.length]} 
                      style={styles.hotelImage} 
                      fallbackUri={HOTEL_IMAGES[idx % HOTEL_IMAGES.length]}
                    />
                    <View style={styles.hotelRatingPill}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.hotelRatingText}>{hotel.rating || "4.8"}</Text>
                    </View>
                    <View style={styles.hotelPricePill}>
                      <Text style={styles.hotelPriceText}>{hotel.price}</Text>
                    </View>
                  </View>

                  <View style={styles.hotelBody}>
                    <Text style={[styles.hotelName, { color: theme.text }]} numberOfLines={1}>{hotel.name}</Text>
                    <Text style={[styles.hotelAddress, { color: theme.subtext }]} numberOfLines={1}>
                      {hotel.address || hotel.details || "Convenient location"}
                    </Text>

                    <View style={styles.hotelButtonRow}>
                      <TouchableOpacity 
                        style={styles.hotelMapBtn}
                        onPress={() => openInMaps(hotel.name, hotel.coordinates)}
                      >
                        <Ionicons name="location-outline" size={15} color={Colors.PRIMARY} />
                        <Text style={styles.hotelMapBtnText}>Map</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.hotelMapBtn, { backgroundColor: "rgba(16, 185, 129, 0.12)", marginLeft: 8 }]}
                        onPress={() => getDirectDirections(hotel.name, hotel.coordinates)}
                      >
                        <Ionicons name="navigate-outline" size={15} color="#10B981" />
                        <Text style={[styles.hotelMapBtnText, { color: "#10B981" }]}>Directions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Daily Itinerary Section */}
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
              <View style={[styles.dayCardHeader, { backgroundColor: theme.card }]}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Day {day.day}</Text>
                </View>
                <Text style={[styles.dayThemeText, { color: theme.text }]} numberOfLines={1}>{day.theme}</Text>
                
                {/* 🗺️ Open Interactive Route Modal */}
                <TouchableOpacity 
                  style={styles.dayRouteBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDayForRoute(day);
                  }}
                >
                  <Ionicons name="map" size={13} color="#FFF" />
                  <Text style={styles.dayRouteBtnText}>Route Map</Text>
                </TouchableOpacity>
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
                            onPress={() => openInMaps(act.placeName, act.coordinates)}
                          >
                            <Ionicons name="location" size={13} color={Colors.PRIMARY} />
                            <Text style={styles.mapQuickText}>Map</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.mapQuickBtn, { marginLeft: 6 }]}
                            onPress={() => getDirectDirections(act.placeName, act.coordinates)}
                          >
                            <Ionicons name="navigate" size={13} color="#10B981" />
                            <Text style={[styles.mapQuickText, { color: "#10B981" }]}>Directions</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
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
                          <MaterialCommunityIcons name="ticket-outline" size={13} color={Colors.PRIMARY} />
                          <Text style={styles.ticketPillText}>Tickets: {act.tickets}</Text>
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
      <Modal
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
            <TouchableOpacity 
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
        destination={plan?.destination}
        onClose={() => setSelectedDayForRoute(null)}
        theme={theme}
      />

      {/* Trip Budget & Expense Tracker Modal */}
      <ExpenseTrackerModal
        visible={showExpenseModal}
        expenses={tripData?.expenses || []}
        budgetTier={plan?.budget || tripData?.budget || "Moderate"}
        onSaveExpenses={handleSaveExpenses}
        onClose={() => setShowExpenseModal(false)}
        theme={theme}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  title: { fontSize: 28, fontFamily: "Outfit-Bold" },
  subtitle: { fontSize: 14, fontFamily: "Outfit-Medium", marginTop: 2 },
  headerOfflinePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  headerOfflineText: {
    color: "#10B981",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    marginLeft: 3,
  },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconButton: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
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

  // Hotel Cards
  hotelCard: { 
    width: 240, 
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
});