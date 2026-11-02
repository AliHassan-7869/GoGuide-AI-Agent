import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Colors } from "../constants/constants";
import { getCurrencySymbol, convertAmount } from "../constants/Currency";

const EXPENSE_CATEGORIES = [
  { id: "Food", label: "Dining", icon: "restaurant-outline", color: "#F59E0B" },
  { id: "Transit", label: "Transport", icon: "car-outline", color: "#0284C7" },
  { id: "Tickets", label: "Tickets", icon: "ticket-outline", color: "#8B5CF6" },
  { id: "Stay", label: "Hotel", icon: "bed-outline", color: "#10B981" },
  { id: "Shopping", label: "Shopping", icon: "bag-handle-outline", color: "#EC4899" },
  { id: "Other", label: "Other", icon: "wallet-outline", color: "#64748B" },
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
  onSaveExpenses,
  onClose,
  theme,
}) {
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Food");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  const showAlert = (title, message) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const symbol = getCurrencySymbol(currency);

  // Estimate target budget from tier if not custom, converted to user currency
  const baseBudgetUSD =
    budgetTier.toLowerCase().includes("luxury")
      ? 3000
      : budgetTier.toLowerCase().includes("economical") || budgetTier.toLowerCase().includes("cheap")
      ? 600
      : 1500;

  const targetBudgetNumber = convertAmount(baseBudgetUSD, currency);

  const totalSpent = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remainingBudget = Math.max(0, targetBudgetNumber - totalSpent);
  const percentSpent = Math.min(100, Math.round((totalSpent / targetBudgetNumber) * 100));

  const applyPreset = (preset) => {
    triggerHaptic();
    const converted = convertAmount(preset.amount, currency);
    setExpenseTitle(preset.title);
    setExpenseAmount(String(converted));
    setSelectedCategory(preset.category);
    setEditingExpenseId(null);
    setShowAddForm(true);
  };

  const handleStartEdit = (item) => {
    triggerHaptic();
    setEditingExpenseId(item.id);
    setExpenseTitle(item.title);
    setExpenseAmount(String(item.amount));
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
    const amountNum = parseFloat(expenseAmount.trim());
    if (!expenseTitle.trim()) {
      showAlert("Input Required", "Please enter an expense name.");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      showAlert("Invalid Amount", "Please enter a valid expense amount.");
      return;
    }

    if (editingExpenseId && !asNewEntry) {
      // Update existing expense in-place
      const updated = expenses.map((e) => {
        if (e.id === editingExpenseId) {
          return {
            ...e,
            title: expenseTitle.trim(),
            amount: amountNum,
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.isDark ? "#282828" : "#E5E7EB" }]}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Trip Budget & Expenses</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Target: {symbol}{targetBudgetNumber.toLocaleString()} ({budgetTier})
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.isDark ? "#282828" : "#F3F4F6" }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Budget Overview Card */}
          <View style={[styles.budgetCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.budgetRow}>
              <View>
                <Text style={[styles.metricLabel, { color: theme.subtext }]}>Total Spent</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{symbol}{totalSpent.toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.metricLabel, { color: theme.subtext }]}>Remaining</Text>
                <Text style={[styles.metricValue, { color: remainingBudget > 0 ? "#10B981" : "#EF4444" }]}>
                  {symbol}{remainingBudget.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Gauge Progress Bar */}
            <View style={[styles.progressBarTrack, { backgroundColor: theme.isDark ? "#2A2A2A" : "#E5E7EB" }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percentSpent}%`,
                    backgroundColor: percentSpent > 90 ? "#EF4444" : percentSpent > 70 ? "#F59E0B" : Colors.PRIMARY,
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
            <Text style={[styles.presetsTitle, { color: theme.subtext }]}>⚡ 1-Tap Quick Presets:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {QUICK_PRESETS.map((p, idx) => {
                const converted = convertAmount(p.amount, currency);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => applyPreset(p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={p.icon} size={14} color={Colors.PRIMARY} style={{ marginRight: 5 }} />
                    <Text style={[styles.presetChipText, { color: theme.text }]}>
                      {p.title} ({symbol}{converted})
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
                <TouchableOpacity onPress={handleCancelForm}>
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
                    backgroundColor: theme.isDark ? "#252525" : "#F9FAFB",
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />

              <TextInput
                placeholder={`Amount (${currency} ${symbol})`}
                placeholderTextColor={theme.subtext}
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.isDark ? "#252525" : "#F9FAFB",
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />

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
                            ? "#252525"
                            : "#F3F4F6",
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
                        color={isSelected ? "#FFF" : theme.subtext}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.categoryPillText,
                          { color: isSelected ? "#FFFFFF" : theme.text },
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
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.submitBtnText}>Update</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { flex: 1, backgroundColor: "#10B981" }]}
                    onPress={() => handleSaveOrUpdate(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="repeat-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
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
                No expenses logged yet. Tap "Log New Expense" above to track your spending!
              </Text>
            </View>
          ) : (
            expenses.map((item) => {
              const catMeta =
                EXPENSE_CATEGORIES.find((c) => c.id === item.category) ||
                EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

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
                      {catMeta.label} • {item.createdAt || "Today"}
                    </Text>
                  </View>

                  <Text style={[styles.expenseItemAmount, { color: theme.text }]}>
                    {symbol}{Number(item.amount).toLocaleString()}
                  </Text>

                  <View style={styles.itemActionGroup}>
                    {/* Quick Edit */}
                    <TouchableOpacity
                      onPress={() => handleStartEdit(item)}
                      style={styles.iconBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil-outline" size={16} color={Colors.PRIMARY} />
                    </TouchableOpacity>

                    {/* Quick Renew / Repeat */}
                    <TouchableOpacity
                      onPress={() => handleQuickRenew(item)}
                      style={[styles.iconBtn, { marginHorizontal: 2 }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="repeat-outline" size={16} color="#10B981" />
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      onPress={() => handleDeleteExpense(item.id)}
                      style={styles.iconBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
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
    fontSize: 11,
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
    color: "#FFFFFF",
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
    fontSize: 11,
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
