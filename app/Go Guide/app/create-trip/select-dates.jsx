import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../Components/constants/constants";
import { useTheme } from "../../Components/constants/theme";
import StepProgressBar from "../../Components/CreateTrip/StepProgressBar";
import { CreateTripContext } from "../../context/CreateTripContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Lightweight, cross-platform calendar component (eliminates date-fns web bundler bug)
function CustomCalendarView({
  startDate,
  endDate,
  onDateChange,
  theme,
  activeAccent,
}) {
  const [viewDate, setViewDate] = useState(() => startDate || new Date());

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normStart = startDate
    ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    : null;
  const normEnd = endDate
    ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    : null;

  const handleDayPress = (day) => {
    const selected = new Date(currentYear, currentMonth, day);
    selected.setHours(0, 0, 0, 0);

    if (!normStart || (normStart && normEnd)) {
      onDateChange(selected, "START_DATE");
    } else if (normStart && !normEnd) {
      if (selected.getTime() < normStart.getTime()) {
        onDateChange(selected, "START_DATE");
      } else {
        onDateChange(selected, "END_DATE");
      }
    }
  };

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ empty: true, key: `empty-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dDate = new Date(currentYear, currentMonth, d);
    dDate.setHours(0, 0, 0, 0);
    const time = dDate.getTime();

    const isPast = time < today.getTime();
    const isToday = time === today.getTime();
    const isStart = normStart && time === normStart.getTime();
    const isEnd = normEnd && time === normEnd.getTime();
    const isInRange =
      normStart && normEnd && time > normStart.getTime() && time < normEnd.getTime();

    cells.push({
      empty: false,
      day: d,
      date: dDate,
      isPast,
      isToday,
      isStart,
      isEnd,
      isInRange,
      key: `day-${d}`,
    });
  }

  return (
    <View style={{ width: "100%", paddingVertical: 10 }}>
      {/* Month Navigation */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: theme.isDark ? "#242436" : "#F1F5F9",
          }}
        >
          <Ionicons name="chevron-back" size={18} color={activeAccent} />
        </TouchableOpacity>

        <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: theme.text }}>
          {monthNames[currentMonth]} {currentYear}
        </Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: theme.isDark ? "#242436" : "#F1F5F9",
          }}
        >
          <Ionicons name="chevron-forward" size={18} color={activeAccent} />
        </TouchableOpacity>
      </View>

      {/* Week Day Labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 10 }}>
        {dayLabels.map((lbl, idx) => (
          <Text
            key={idx}
            style={{
              width: 38,
              textAlign: "center",
              fontSize: 12,
              fontFamily: "Outfit-Bold",
              color: idx === 0 || idx === 6 ? activeAccent : theme.subtext,
            }}
          >
            {lbl}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" }}>
        {cells.map((cell) => {
          if (cell.empty) {
            return <View key={cell.key} style={{ width: `${100 / 7}%`, height: 40 }} />;
          }

          const isSelected = cell.isStart || cell.isEnd;
          let bgColor = "transparent";
          let textColor = theme.text;

          if (isSelected) {
            bgColor = activeAccent;
            textColor = "#FFFFFF";
          } else if (cell.isInRange) {
            bgColor = activeAccent + "22";
            textColor = activeAccent;
          } else if (cell.isToday) {
            bgColor = theme.isDark ? "#2E384D" : "#E2E8F0";
          }

          return (
            <TouchableOpacity
              key={cell.key}
              disabled={cell.isPast}
              onPress={() => handleDayPress(cell.day)}
              style={{
                width: `${100 / 7}%`,
                height: 40,
                justifyContent: "center",
                alignItems: "center",
                opacity: cell.isPast ? 0.3 : 1,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: isSelected ? 17 : cell.isInRange ? 6 : 17,
                  backgroundColor: bgColor,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: isSelected ? "Outfit-Bold" : "Outfit-Medium",
                    color: textColor,
                  }}
                >
                  {cell.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function SelectDates() {
  const router = useRouter();
  const theme = useTheme();
  const { tripData, setTripData } = useContext(CreateTripContext);

  const initialDays = tripData?.totalNoOfDays || 5;
  const [selectedDuration, setSelectedDuration] = useState(initialDays);
  const [manualDaysInput, setManualDaysInput] = useState(String(initialDays));
  const [isManualActive, setIsManualActive] = useState(false);

  const [startDate, setStartDate] = useState(
    tripData?.startDate ? new Date(tripData.startDate) : null
  );
  const [endDate, setEndDate] = useState(
    tripData?.endDate ? new Date(tripData.endDate) : null
  );
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  const activeAccent = Colors.PRIMARY || "#0A7EA4";

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  // Helper to format readable brief date (e.g. "24 Oct")
  const formatDateBrief = (d) => {
    if (!d) return "";
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  // Helper to calculate end date from a start date and day count
  const calculateEndDateFromDays = (start, daysCount) => {
    const s = new Date(start || new Date());
    const e = new Date(s);
    e.setDate(s.getDate() + Math.max(1, daysCount) - 1);
    return e;
  };

  // Sync dates when duration pills or manual days change
  const applyDuration = (days) => {
    const validDays = Math.max(1, Math.min(30, days));
    setSelectedDuration(validDays);
    setManualDaysInput(String(validDays));
    setSelectedBlockId(null);

    const baseStart = startDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // default to tomorrow
    const newEnd = calculateEndDateFromDays(baseStart, validDays);
    setStartDate(baseStart);
    setEndDate(newEnd);
  };

  // Handler for duration pill tap
  const handlePillSelect = (days) => {
    triggerHaptic();
    setIsManualActive(false);
    applyDuration(days);
  };

  // Handler for manual days text change
  const handleManualDaysChange = (text) => {
    const numericOnly = text.replace(/[^0-9]/g, "");
    setManualDaysInput(numericOnly);
    setIsManualActive(true);
    const parsed = parseInt(numericOnly, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(30, parsed);
      setSelectedDuration(clamped);
      const baseStart = startDate || new Date(Date.now() + 24 * 60 * 60 * 1000);
      setStartDate(baseStart);
      setEndDate(calculateEndDateFromDays(baseStart, clamped));
      setSelectedBlockId(null);
    }
  };

  // Handler for manual stepper +/-
  const handleStepDays = (delta) => {
    triggerHaptic();
    setIsManualActive(true);
    const current = selectedDuration || 5;
    const nextVal = Math.max(1, Math.min(30, current + delta));
    applyDuration(nextVal);
  };

  // 4 Dynamically calculated recommended date blocks
  const recommendedBlocks = useMemo(() => {
    const today = new Date();

    // Block 1: Upcoming Weekend (Friday to Sunday)
    const weekendStart = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    weekendStart.setDate(today.getDate() + daysUntilFriday);
    const weekendEnd = new Date(weekendStart);
    weekendEnd.setDate(weekendStart.getDate() + 2); // 3 days

    // Block 2: Next Week Break (Monday to Friday - 5 days)
    const nextWeekStart = new Date(today);
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
    nextWeekStart.setDate(today.getDate() + daysUntilMonday);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 4); // 5 days

    // Block 3: 7-Day Explorer (Full week - 7 days)
    const weekStart = new Date(nextWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // 7 days

    // Block 4: Next Month Vacation (1st to 5th of next month)
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 5);

    return [
      {
        id: "block_weekend",
        title: "Weekend Escape",
        emoji: "🏖️",
        tag: "Quick Trip",
        days: 3,
        start: weekendStart,
        end: weekendEnd,
        rangeLabel: `${formatDateBrief(weekendStart)} - ${formatDateBrief(weekendEnd)}`,
      },
      {
        id: "block_next_week",
        title: "Next Week Break",
        emoji: "✈️",
        tag: "Popular",
        days: 5,
        start: nextWeekStart,
        end: nextWeekEnd,
        rangeLabel: `${formatDateBrief(nextWeekStart)} - ${formatDateBrief(nextWeekEnd)}`,
      },
      {
        id: "block_full_week",
        title: "7-Day Explorer",
        emoji: "🗺️",
        tag: "Recommended",
        days: 7,
        start: weekStart,
        end: weekEnd,
        rangeLabel: `${formatDateBrief(weekStart)} - ${formatDateBrief(weekEnd)}`,
      },
      {
        id: "block_next_month",
        title: "Next Month Holiday",
        emoji: "🌴",
        tag: "Long Ahead",
        days: 5,
        start: nextMonthStart,
        end: nextMonthEnd,
        rangeLabel: `${formatDateBrief(nextMonthStart)} - ${formatDateBrief(nextMonthEnd)}`,
      },
    ];
  }, []);

  // Handler for recommended block selection
  const handleSelectBlock = (block) => {
    triggerHaptic();
    setSelectedBlockId(block.id);
    setIsManualActive(false);
    setSelectedDuration(block.days);
    setManualDaysInput(String(block.days));
    setStartDate(block.start);
    setEndDate(block.end);
  };

  // Calendar date change handler
  const onDateChange = (date, type) => {
    triggerHaptic();
    setSelectedBlockId(null);
    setIsManualActive(false);

    if (type === "END_DATE") {
      const eDate = date ? new Date(date) : null;
      setEndDate(eDate);
      if (startDate && eDate) {
        const diff = Math.abs(eDate.getTime() - startDate.getTime());
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
        setSelectedDuration(days);
        setManualDaysInput(String(days));
      }
    } else {
      const sDate = date ? new Date(date) : null;
      setStartDate(sDate);
      setEndDate(null);
    }
  };

  // Ensure default startDate & endDate on mount if not set
  useEffect(() => {
    if (!startDate || !endDate) {
      const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const defaultEnd = calculateEndDateFromDays(defaultStart, selectedDuration || 5);
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
    }
  }, []);

  const onDateSelectionContinue = () => {
    triggerHaptic();
    const finalDays = selectedDuration || 5;
    const finalStart = startDate || new Date(Date.now() + 24 * 60 * 60 * 1000);
    const finalEnd = endDate || calculateEndDateFromDays(finalStart, finalDays);

    setTripData((prev) => ({
      ...prev,
      startDate: finalStart,
      endDate: finalEnd,
      totalNoOfDays: finalDays,
    }));

    router.push("/create-trip/select-budget");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Dates & Duration</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <StepProgressBar currentStep={4} totalSteps={6} stepTitle="Duration & Pace" />

        <Text style={styles.heroPreTitle}>DURATION & PACE</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          How long will this journey be?
        </Text>

        {/* LIVE TRIP DURATION BADGE */}
        <View style={styles.durationPillBadge}>
          <Text style={styles.durationBadgeSparkle}>✨</Text>
          <Text style={styles.durationBadgeText}>
            {selectedDuration} Days, {Math.max(1, selectedDuration - 1)} Nights Selected
          </Text>
        </View>

        {/* 1. INTERACTIVE DURATION PILLS (Quick Select) */}
        <Text style={[styles.subSectionTitle, { color: theme.subtext }]}>
          QUICK DURATION PRESETS
        </Text>
        <View style={styles.durationGrid}>
          {[3, 5, 7, 10, 14, 21].map((days) => {
            const isSel = selectedDuration === days && !isManualActive && !selectedBlockId;
            return (
              <TouchableOpacity
                key={days}
                onPress={() => handlePillSelect(days)}
                activeOpacity={0.75}
                style={[
                  styles.durationOptionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isSel ? "#F59E0B" : theme.border,
                  },
                  isSel && styles.durationOptionCardActive,
                ]}
              >
                <Text
                  style={[
                    styles.durationDayCount,
                    { color: isSel ? "#F59E0B" : theme.text },
                  ]}
                >
                  {days}
                </Text>
                <Text
                  style={[
                    styles.durationDayLabel,
                    { color: isSel ? "#F59E0B" : theme.subtext },
                  ]}
                >
                  DAYS
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. MANUAL CUSTOM DAYS SELECTOR (User can enter days manually) */}
        <View
          style={[
            styles.manualDaysCard,
            {
              backgroundColor: theme.card,
              borderColor: isManualActive ? "#F59E0B" : theme.border,
            },
          ]}
        >
          <View style={styles.manualHeaderRow}>
            <View style={styles.manualIconCircle}>
              <Ionicons name="options-outline" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.manualTitle, { color: theme.text }]}>
                Custom Duration (Enter Manually)
              </Text>
              <Text style={[styles.manualSubtitle, { color: theme.subtext }]}>
                Apni marzi se jitne marzi din select ya type karein (1–30 Days)
              </Text>
            </View>
          </View>

          <View style={styles.manualControlsRow}>
            {/* Decrement Button */}
            <TouchableOpacity
              onPress={() => handleStepDays(-1)}
              style={[
                styles.stepperBtn,
                { backgroundColor: theme.isDark ? "#283042" : "#F1F5F9" },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={20} color={theme.text} />
            </TouchableOpacity>

            {/* Direct Number Input */}
            <View
              style={[
                styles.manualInputWrapper,
                {
                  backgroundColor: theme.isDark ? "#0F172A" : "#FFFFFF",
                  borderColor: isManualActive ? "#F59E0B" : theme.border,
                },
              ]}
            >
              <TextInput
                value={manualDaysInput}
                onChangeText={handleManualDaysChange}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.manualTextInput, { color: theme.text }]}
                placeholder="5"
                placeholderTextColor={theme.subtext}
              />
              <Text style={[styles.manualDaysSuffix, { color: theme.subtext }]}>DAYS</Text>
            </View>

            {/* Increment Button */}
            <TouchableOpacity
              onPress={() => handleStepDays(1)}
              style={[
                styles.stepperBtn,
                { backgroundColor: theme.isDark ? "#283042" : "#F1F5F9" },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CALM NOTE BOX */}
        <View style={styles.calmNoteBox}>
          <Text style={styles.calmNoteTitle}>Optimal Itinerary Pacing</Text>
          <Text style={styles.calmNoteBody}>
            {selectedDuration} days allows our AI copilot to build 2–3 daily balanced landmarks without itinerary burnout.
          </Text>
        </View>

        {/* 3. RECOMMENDED DATE BLOCKS (1-Tap Pick) */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            Recommended Date Blocks
          </Text>
        </View>

        <View style={styles.blocksGrid}>
          {recommendedBlocks.map((block) => {
            const isSelected = selectedBlockId === block.id;
            return (
              <TouchableOpacity
                key={block.id}
                onPress={() => handleSelectBlock(block)}
                activeOpacity={0.8}
                style={[
                  styles.blockCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isSelected ? activeAccent : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.blockTopRow}>
                  <Text style={styles.blockEmoji}>{block.emoji}</Text>
                  <View
                    style={[
                      styles.blockTagBadge,
                      {
                        backgroundColor: isSelected
                          ? activeAccent + "18"
                          : theme.isDark
                          ? "#252538"
                          : "#F1F5F9",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.blockTagText,
                        { color: isSelected ? activeAccent : theme.subtext },
                      ]}
                    >
                      {block.days} Days
                    </Text>
                  </View>
                </View>

                <Text style={[styles.blockTitle, { color: theme.text }]} numberOfLines={1}>
                  {block.title}
                </Text>
                <Text
                  style={[
                    styles.blockRange,
                    { color: isSelected ? activeAccent : theme.subtext },
                  ]}
                >
                  {block.rangeLabel}
                </Text>

                {isSelected && (
                  <View style={[styles.selectedCheck, { backgroundColor: activeAccent }]}>
                    <Ionicons name="checkmark" size={12} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. MANUAL CALENDAR PICKER */}
        <View style={[styles.sectionTitleRow, { marginTop: 26 }]}>
          <Ionicons name="calendar-outline" size={16} color={activeAccent} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            Or Pick Exact Calendar Dates
          </Text>
        </View>

        <View
          style={[
            styles.calendarCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <CustomCalendarView
            startDate={startDate}
            endDate={endDate}
            onDateChange={onDateChange}
            theme={theme}
            activeAccent={activeAccent}
          />
        </View>
      </ScrollView>

      {/* BOTTOM FOOTER */}
      <View style={[styles.footer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={onDateSelectionContinue}
          style={[styles.continueBtn, { backgroundColor: activeAccent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>
            Continue to Budget ({selectedDuration} Days)
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  heroPreTitle: {
    color: "#0A7EA4",
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  durationPillBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  durationBadgeSparkle: {
    fontSize: 12,
  },
  durationBadgeText: {
    color: "#F59E0B",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  subSectionTitle: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  durationOptionCard: {
    width: (SCREEN_WIDTH - 60) / 3,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  durationOptionCardActive: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  durationDayCount: {
    fontSize: 22,
    fontFamily: "Outfit-Bold",
  },
  durationDayLabel: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    marginTop: 2,
  },
  // Manual Custom Days Card
  manualDaysCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  manualHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  manualIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  manualTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  manualSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  manualControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  manualInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 120,
    gap: 6,
  },
  manualTextInput: {
    fontSize: 22,
    fontFamily: "Outfit-Bold",
    textAlign: "center",
    minWidth: 40,
    padding: 0,
  },
  manualDaysSuffix: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
  },
  calmNoteBox: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderLeftWidth: 3,
    borderLeftColor: "#0A7EA4",
    padding: 14,
    borderRadius: 8,
    marginBottom: 24,
  },
  calmNoteTitle: {
    color: "#F59E0B",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  calmNoteBody: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 4,
    lineHeight: 17,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
  },
  blocksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  blockCard: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  blockTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  blockEmoji: {
    fontSize: 22,
  },
  blockTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  blockTagText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  blockTitle: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    marginBottom: 3,
  },
  blockRange: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
  },
  selectedCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCard: {
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  continueText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
});
