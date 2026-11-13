import React, { useState, useEffect } from "react";
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Colors } from "../constants/constants";
import {
  CURRENCY_RATES,
  getCurrencySymbol,
  convertAmount,
  convertBetweenCurrencies,
  detectCurrencyFromLocation,
} from "../constants/Currency";

import { TouchableOpacity } from "../ui/Touchable";
import { Palette } from "../constants/theme";
const EXPENSE_CATEGORIES = [
  { id: "Food", label: "Dining", icon: "restaurant-outline", color: Palette.warning },
  { id: "Transit", label: "Transport", icon: "car-outline", color: Palette.skyDark },
  { id: "Tickets", label: "Tickets", icon: "ticket-outline", color: Palette.purple },
  { id: "Stay", label: "Hotel", icon: "bed-outline", color: Palette.success },
  { id: "Shopping", label: "Shopping", icon: "bag-handle-outline", color: "#EC4899" },
  { id: "Other", label: "Other", icon: "wallet-outline", color: Palette.slate500 },
];

const QUICK_PRESETS = [
  { title: "Coffee & Snacks", amount: 6, category: "Food", icon: "cafe-outline" },
  { title: "Taxi / Transit", amount: 16, category: "Transit", icon: "car-outline" },
  { title: "Lunch / Dinner", amount: 32, category: "Food", icon: "restaurant-outline" },
  { title: "Entry Ticket", amount: 20, category: "Tickets", icon: "ticket-outline" },
  { title: "Shopping / Gifts", amount: 25, category: "Shopping", icon: "bag-handle-outline" },
];

export default function ExpenseTrackerModal({
  visible,
  expenses = [],
  budgetTier = "Moderate",
  currency = "USD",
  destination = "",
  origin = "",
  onSaveExpenses,
  onClose,
  theme,
  initialDay = "",
}) {
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Food");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseDay, setExpenseDay] = useState(initialDay || "");

  const destCurrency = detectCurrencyFromLocation(destination) || "GBP";
  const originCurrency = detectCurrencyFromLocation(origin) || "PKR";

  // Build unique list of smart currencies for this trip (Destination + Home/Origin + USD + PKR/EUR/GBP)
  const currencyOptions = Array.from(
    new Set([destCurrency, originCurrency, currency || "USD", "USD", "PKR", "GBP", "EUR"])
  ).filter(Boolean).slice(0, 5);

  const [activeViewCurrency, setActiveViewCurrency] = useState(currency || "USD");
  const [inputCurrency, setInputCurrency] = useState(destCurrency || currency || "USD");

  useEffect(() => {
    if (visible && (initialDay || destCurrency)) {
      const timer = setTimeout(() => {
        if (initialDay) {
          setExpenseDay(initialDay);
          setShowAddForm(true);
        }
        if (destCurrency) {
          setInputCurrency(destCurrency);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible, initialDay, destCurrency]);

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  const showAlert = (title, message) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const baseCurrency = currency || "USD";
  const symbol = getCurrencySymbol(activeViewCurrency);
  const inputSymbol = getCurrencySymbol(inputCurrency);

  // Estimate target budget from tier if not custom, converted to base currency & active view currency
  const baseBudgetUSD =
    budgetTier.toLowerCase().includes("luxury")
      ? 3000
      : budgetTier.toLowerCase().includes("economical") || budgetTier.toLowerCase().includes("cheap")
      ? 600
      : 1500;

  const targetBudgetBase = convertAmount(baseBudgetUSD, baseCurrency);
  const totalSpentBase = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remainingBudgetBase = Math.max(0, targetBudgetBase - totalSpentBase);
  const percentSpent = Math.min(100, Math.round((totalSpentBase / Math.max(1, targetBudgetBase)) * 100));

  const targetBudgetNumber = convertBetweenCurrencies(targetBudgetBase, baseCurrency, activeViewCurrency);
  const totalSpent = convertBetweenCurrencies(totalSpentBase, baseCurrency, activeViewCurrency);
  const remainingBudget = convertBetweenCurrencies(remainingBudgetBase, baseCurrency, activeViewCurrency);

  const applyPreset = (preset) => {
    triggerHaptic();
    const converted = convertAmount(preset.amount, activeViewCurrency);
    setExpenseTitle(preset.title);
    setExpenseAmount(String(converted));
    setInputCurrency(activeViewCurrency);
    setSelectedCategory(preset.category);
    setEditingExpenseId(null);
    setShowAddForm(true);
  };

  const handleStartEdit = (item) => {
    triggerHaptic();
    setEditingExpenseId(item.id);
    setExpenseTitle(item.title);
    const inViewCur = convertBetweenCurrencies(item.amount, baseCurrency, activeViewCurrency);
    setExpenseAmount(String(inViewCur));
    setInputCurrency(activeViewCurrency);
    setSelectedCategory(item.category || "Food");
    setShowAddForm(true);
  };

  const handleQuickRenew = (item) => {
    triggerHaptic();
    const renewed = {
      id: Date.now().toString(),
      title: item.title,
      amount: item.amount,
      category: item.category,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [renewed, ...expenses];
    onSaveExpenses(updated);
    showAlert("Expense Renewed!", `"${item.title}" re-logged for today.`);
  };

  const handleSaveOrUpdate = (asNewEntry = false) => {
    triggerHaptic();
    const rawNum = parseFloat(expenseAmount.trim());
    if (!expenseTitle.trim()) {
      showAlert("Input Required", "Please enter an expense name.");
      return;
    }
    if (isNaN(rawNum) || rawNum <= 0) {
      showAlert("Invalid Amount", "Please enter a valid expense amount.");
      return;
    }

    // Convert from chosen inputCurrency back to baseCurrency for storage consistency
    const amountNum =
      inputCurrency === baseCurrency
        ? rawNum
        : convertBetweenCurrencies(rawNum, inputCurrency, baseCurrency);

    if (editingExpenseId && !asNewEntry) {
      // Update existing expense in-place
      const updated = expenses.map((e) => {
        if (e.id === editingExpenseId) {
          return {
            ...e,
            title: expenseTitle.trim(),
            amount: amountNum,
            day: expenseDay || e.day || undefined,
            originalInput: `${inputSymbol}${rawNum.toLocaleString()} (${inputCurrency})`,
            category: selectedCategory,
            updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        }
        return e;
      });
      onSaveExpenses(updated);
      showAlert("Expense Updated", `"${expenseTitle.trim()}" has been updated.`);
    } else {
      // Add new or Renew as new expense
      const newExpense = {
        id: Date.now().toString(),
        title: expenseTitle.trim(),
        amount: amountNum,
        day: expenseDay || undefined,
        originalInput: `${inputSymbol}${rawNum.toLocaleString()} (${inputCurrency})`,
        category: selectedCategory,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const updated = [newExpense, ...expenses];
      onSaveExpenses(updated);
      if (asNewEntry) {
        showAlert("Expense Renewed", `"${expenseTitle.trim()}" added as a new entry.`);
      }
    }

    setEditingExpenseId(null);
    setExpenseTitle("");
    setExpenseAmount("");
    setShowAddForm(false);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingExpenseId(null);
    setExpenseTitle("");
    setExpenseAmount("");
  };

  const handleDeleteExpense = (id) => {
    triggerHaptic();
    const executeDelete = () => {
      const updated = expenses.filter((e) => e.id !== id);
      onSaveExpenses(updated);
    };

    if (Platform.OS === "web") {
      if (window.confirm("Delete this expense item?")) executeDelete();
    } else {
      Alert.alert("Delete Expense", "Remove this expense item?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: executeDelete },
      ]);
    }
  };

  return (
    <Modal statusBarTranslucent
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.isDark ? Palette.charcoal : Palette.gray200 }]}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Trip Budget & Expenses</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Target: {symbol}{targetBudgetNumber.toLocaleString()} ({budgetTier})
            </Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close"
            style={[styles.closeBtn, { backgroundColor: theme.isDark ? Palette.charcoal : Palette.gray100 }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 💱 Live Multi-Currency Switcher Bar */}
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: theme.subtext }}>
                💱 LIVE CURRENCY CONVERTER
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Outfit-Medium", color: Colors.PRIMARY }}>
                $1 = {getCurrencySymbol(destCurrency)}{CURRENCY_RATES[destCurrency]?.rate || 1} ({destCurrency}) • {getCurrencySymbol(originCurrency)}{CURRENCY_RATES[originCurrency]?.rate || 278} ({originCurrency})
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {currencyOptions.map((code) => {
                const isActive = activeViewCurrency === code;
                const sym = getCurrencySymbol(code);
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => {
                      triggerHaptic();
                      setActiveViewCurrency(code);
                      setInputCurrency(code);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      marginRight: 8,
                      borderWidth: 1,
                      backgroundColor: isActive ? Colors.PRIMARY : theme.card,
                      borderColor: isActive ? Colors.PRIMARY : theme.border,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Outfit-Bold",
                        color: isActive ? Palette.white : theme.text,
                      }}
                    >
                      {code} ({sym.trim()})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Budget Overview Card */}
          <View style={[styles.budgetCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.budgetRow}>
              <View>
                <Text style={[styles.metricLabel, { color: theme.subtext }]}>Total Spent ({activeViewCurrency})</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{symbol}{totalSpent.toLocaleString()}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Medium", color: theme.subtext, marginTop: 2 }}>
                  ≈ ${convertBetweenCurrencies(totalSpentBase, baseCurrency, "USD").toLocaleString()} USD • {getCurrencySymbol(originCurrency)}{convertBetweenCurrencies(totalSpentBase, baseCurrency, originCurrency).toLocaleString()}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.metricLabel, { color: theme.subtext }]}>Remaining ({activeViewCurrency})</Text>
                <Text style={[styles.metricValue, { color: remainingBudget > 0 ? Palette.success : Palette.danger }]}>
                  {symbol}{remainingBudget.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Medium", color: theme.subtext, marginTop: 2 }}>
                  ≈ ${convertBetweenCurrencies(remainingBudgetBase, baseCurrency, "USD").toLocaleString()} USD • {getCurrencySymbol(destCurrency)}{convertBetweenCurrencies(remainingBudgetBase, baseCurrency, destCurrency).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Gauge Progress Bar */}
            <View style={[styles.progressBarTrack, { backgroundColor: theme.isDark ? Palette.charcoalMid : Palette.gray200 }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percentSpent}%`,
                    backgroundColor: percentSpent > 90 ? Palette.danger : percentSpent > 70 ? Palette.warning : Colors.PRIMARY,
                  },
                ]}
              />
            </View>

            <View style={styles.progressBottomRow}>
              <Text style={[styles.progressHint, { color: theme.subtext }]}>{percentSpent}% of budget used</Text>
              <Text style={[styles.progressHint, { color: theme.subtext }]}>Cap: {symbol}{targetBudgetNumber.toLocaleString()}</Text>
            </View>
          </View>

          {/* 1-Tap Quick Expense Presets */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.presetsTitle, { color: theme.subtext }]}>⚡ 1-Tap Quick Presets ({activeViewCurrency}):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {QUICK_PRESETS.map((p, idx) => {
                const converted = convertAmount(p.amount, activeViewCurrency);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => applyPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={p.icon} size={14} color={Colors.PRIMARY} style={{ marginRight: 5 }} />
                    <Text style={[styles.presetChipText, { color: theme.text }]}>
                      {p.title} ({symbol}{converted.toLocaleString()})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Add Expense Toggle Button */}
          {!showAddForm ? (
            <TouchableOpacity
              style={styles.openFormBtn}
              onPress={() => {
                triggerHaptic();
                setInputCurrency(activeViewCurrency);
                setShowAddForm(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color={Colors.PRIMARY} />
              <Text style={styles.openFormBtnText}>Log New Expense</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.formCardHeader}>
                <Text style={[styles.formTitle, { color: theme.text }]}>
                  {editingExpenseId ? "✏️ Edit & Renew Expense" : "Add Expense"}
                </Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={handleCancelForm}>
                  <Ionicons name="close-circle-outline" size={22} color={theme.subtext} />
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Expense Name (e.g. Louvre Tickets, Dinner)"
                placeholderTextColor={theme.subtext}
                value={expenseTitle}
                onChangeText={setExpenseTitle}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.isDark ? Palette.charcoalDark : "#F9FAFB",
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />

              {/* Day Tag Indicator if opened for specific day */}
              {expenseDay ? (
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 6 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: Colors.PRIMARY + "18",
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: Colors.PRIMARY + "40",
                    }}
                  >
                    <Ionicons name="calendar" size={13} color={Colors.PRIMARY} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: Colors.PRIMARY }}>
                      Logging for: {expenseDay}
                    </Text>
                  </View>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close"
                    onPress={() => setExpenseDay("")}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={16} color={theme.subtext} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* 1-Tap Quick Currency Selector (Local vs Home) */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Medium", color: theme.subtext, marginRight: 2 }}>
                  Currency:
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic();
                    setInputCurrency(destCurrency);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: inputCurrency === destCurrency ? Colors.PRIMARY : theme.isDark ? Palette.charcoalDark : Palette.gray100,
                    borderWidth: 1,
                    borderColor: inputCurrency === destCurrency ? Colors.PRIMARY : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: inputCurrency === destCurrency ? Palette.white : theme.text }}>
                    📍 Local ({destCurrency})
                  </Text>
                </TouchableOpacity>

                {originCurrency !== destCurrency && (
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      setInputCurrency(originCurrency);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 10,
                      backgroundColor: inputCurrency === originCurrency ? Colors.PRIMARY : theme.isDark ? Palette.charcoalDark : Palette.gray100,
                      borderWidth: 1,
                      borderColor: inputCurrency === originCurrency ? Colors.PRIMARY : theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: inputCurrency === originCurrency ? Palette.white : theme.text }}>
                      🏠 Home ({originCurrency})
                    </Text>
                  </TouchableOpacity>
                )}

                {currencyOptions
                  .filter((c) => c !== destCurrency && c !== originCurrency)
                  .map((code) => {
                    const isSel = inputCurrency === code;
                    return (
                      <TouchableOpacity
                        key={code}
                        onPress={() => {
                          triggerHaptic();
                          setInputCurrency(code);
                        }}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 10,
                          backgroundColor: isSel ? Colors.PRIMARY : theme.isDark ? Palette.charcoalDark : Palette.gray100,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: isSel ? Palette.white : theme.text }}>
                          {code}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>

              <TextInput
                placeholder={`Amount (${inputCurrency} ${inputSymbol.trim()})`}
                placeholderTextColor={theme.subtext}
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.isDark ? Palette.charcoalDark : "#F9FAFB",
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />

              {/* Live Real-Time Auto-Conversion Preview Underneath */}
              {parseFloat(expenseAmount) > 0 && (() => {
                const num = parseFloat(expenseAmount);
                // If entering in Local/foreign currency, convert to Home currency (e.g. PKR)
                // If entering in Home currency, convert to Destination/Local currency
                const targetConvCode = inputCurrency === originCurrency ? destCurrency : originCurrency;
                const targetSym = getCurrencySymbol(targetConvCode);
                const converted = convertBetweenCurrencies(num, inputCurrency, targetConvCode);
                const unitRate = convertBetweenCurrencies(1, inputCurrency, targetConvCode);
                const unitRateStr =
                  unitRate >= 1
                    ? unitRate.toLocaleString()
                    : (CURRENCY_RATES[targetConvCode]?.rate / CURRENCY_RATES[inputCurrency]?.rate).toFixed(2);

                return (
                  <View
                    style={{
                      backgroundColor: Colors.PRIMARY + "14",
                      borderLeftWidth: 3,
                      borderLeftColor: Colors.PRIMARY,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Outfit-Bold", color: Colors.PRIMARY }}>
                      ≈ {targetSym}{converted.toLocaleString()} {targetConvCode}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit-Medium", color: theme.subtext, marginTop: 2 }}>
                      (Live Rate: 1 {inputCurrency} = {unitRateStr} {targetConvCode})
                    </Text>
                  </View>
                );
              })()}

              <Text style={[styles.categoryPickerLabel, { color: theme.subtext }]}>Category</Text>
              <View style={styles.categoryWrap}>
                {EXPENSE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: isSelected
                            ? cat.color
                            : theme.isDark
                            ? Palette.charcoalDark
                            : Palette.gray100,
                          borderColor: isSelected ? cat.color : theme.border,
                        },
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        setSelectedCategory(cat.id);
                      }}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={14}
                        color={isSelected ? Palette.white : theme.subtext}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.categoryPillText,
                          { color: isSelected ? Palette.white : theme.text },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {editingExpenseId ? (
                <View style={styles.editActionRow}>
                  <TouchableOpacity
                    style={[styles.submitBtn, { flex: 1, marginRight: 8, backgroundColor: Colors.PRIMARY }]}
                    onPress={() => handleSaveOrUpdate(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={Palette.white} style={{ marginRight: 4 }} />
                    <Text style={styles.submitBtnText}>Update</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { flex: 1, backgroundColor: Palette.success }]}
                    onPress={() => handleSaveOrUpdate(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="repeat-outline" size={16} color={Palette.white} style={{ marginRight: 4 }} />
                    <Text style={styles.submitBtnText}>Re-Add (Renew)</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => handleSaveOrUpdate(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>Save Expense</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Expense Log List */}
          <Text style={[styles.listHeader, { color: theme.text }]}>
            Recorded Expenses ({expenses.length})
          </Text>

          {expenses.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.card }]}>
              <Ionicons name="receipt-outline" size={36} color={theme.subtext} />
              <Text style={[styles.emptyBoxText, { color: theme.subtext }]}>
                No expenses logged yet. Tap &ldquo;Log New Expense&rdquo; above to track your spending!
              </Text>
            </View>
          ) : (
            expenses.map((item) => {
              const catMeta =
                EXPENSE_CATEGORIES.find((c) => c.id === item.category) ||
                EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
              const dispAmt = convertBetweenCurrencies(item.amount, baseCurrency, activeViewCurrency);
              const usdAmt = convertBetweenCurrencies(item.amount, baseCurrency, "USD");
              const pkrAmt = convertBetweenCurrencies(item.amount, baseCurrency, originCurrency);

              return (
                <View
                  key={item.id}
                  style={[styles.expenseRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: catMeta.color + "18" }]}>
                    <Ionicons name={catMeta.icon} size={18} color={catMeta.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.expenseItemTitle, { color: theme.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.expenseItemMeta, { color: theme.subtext }]}>
                      {item.day ? `${item.day} • ` : ""}{catMeta.label} • {item.createdAt || "Today"} • ≈ ${usdAmt.toLocaleString()} / {getCurrencySymbol(originCurrency)}{pkrAmt.toLocaleString()}
                    </Text>
                  </View>

                  <Text style={[styles.expenseItemAmount, { color: theme.text }]}>
                    {symbol}{dispAmt.toLocaleString()}
                  </Text>

                  <View style={styles.itemActionGroup}>
                    {/* Quick Edit */}
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit"
                      onPress={() => handleStartEdit(item)}
                      style={styles.iconBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil-outline" size={16} color={Colors.PRIMARY} />
                    </TouchableOpacity>

                    {/* Quick Renew / Repeat */}
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Regenerate"
                      onPress={() => handleQuickRenew(item)}
                      style={[styles.iconBtn, { marginHorizontal: 2 }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="repeat-outline" size={16} color={Palette.success} />
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete"
                      onPress={() => handleDeleteExpense(item.id)}
                      style={styles.iconBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={Palette.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },
  budgetCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  metricValue: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    marginTop: 14,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressHint: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
  openFormBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.PRIMARY + "15",
    borderWidth: 1,
    borderColor: Colors.PRIMARY + "40",
    marginBottom: 20,
    gap: 8,
  },
  openFormBtnText: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    color: Colors.PRIMARY,
  },
  formCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  formCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: "Outfit-Medium",
    marginBottom: 10,
  },
  categoryPickerLabel: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    marginBottom: 8,
    marginTop: 4,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  submitBtn: {
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  submitBtnText: {
    color: Palette.white,
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  listHeader: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    marginBottom: 12,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyBoxText: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expenseItemTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  expenseItemMeta: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  expenseItemAmount: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    marginRight: 12,
  },
  itemActionGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  editActionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteBtn: {
    padding: 6,
  },
  presetsTitle: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  presetChipText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
});
