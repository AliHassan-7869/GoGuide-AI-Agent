import Ionicons from "@expo/vector-icons/Ionicons";
import useBackDismiss from "../hooks/useBackDismiss";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../Components/constants/constants";
import { Radius, Spacing, Typography, lightTheme, useTheme } from "../Components/constants/theme";
import EmptyState from "../Components/ui/EmptyState";
import FadeInView from "../Components/ui/FadeInView";
import { Skeleton } from "../Components/ui/Skeleton";
import { tapHaptic } from "../Components/utils/haptics";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { CreateTripContext } from "../context/CreateTripContext";

import { TouchableOpacity } from "../Components/ui/Touchable";
const STORAGE_PREFIX = "@goguide_packing_list_v1_";

const CATEGORIES = [
  { id: "all", label: "All", icon: "apps-outline" },
  { id: "documents", label: "Documents", icon: "document-text-outline" },
  { id: "clothes", label: "Clothing", icon: "shirt-outline" },
  { id: "electronics", label: "Tech", icon: "hardware-chip-outline" },
  { id: "health", label: "Health", icon: "medkit-outline" },
  { id: "essentials", label: "Essentials", icon: "bag-handle-outline" },
];

const DEFAULT_PACKING_ITEMS = [
  // Documents
  { id: "doc_1", name: "Original Passport & ID", category: "documents", packed: false, essential: true },
  { id: "doc_2", name: "Boarding Passes & Visa Copies", category: "documents", packed: false, essential: true },
  { id: "doc_3", name: "Hotel & Booking Confirmations", category: "documents", packed: false, essential: false },
  { id: "doc_4", name: "Travel Insurance Card", category: "documents", packed: false, essential: true },

  // Electronics
  { id: "tech_1", name: "Phone & High-Speed Charger", category: "electronics", packed: true, essential: true },
  { id: "tech_2", name: "Universal Travel Power Adapter", category: "electronics", packed: false, essential: true },
  { id: "tech_3", name: "High-Capacity Power Bank", category: "electronics", packed: false, essential: false },
  { id: "tech_4", name: "Noise-Cancelling Headphones", category: "electronics", packed: false, essential: false },

  // Clothes
  { id: "cloth_1", name: "Comfortable Walking Shoes", category: "clothes", packed: false, essential: true },
  { id: "cloth_2", name: "Weather-Appropriate Casual Outfits", category: "clothes", packed: false, essential: false },
  { id: "cloth_3", name: "Light Jacket or Windbreaker", category: "clothes", packed: false, essential: false },
  { id: "cloth_4", name: "Undergarments & Extra Socks", category: "clothes", packed: false, essential: true },

  // Health & Toiletries
  { id: "hlth_1", name: "Personal Prescription Medications", category: "health", packed: false, essential: true },
  { id: "hlth_2", name: "Hand Sanitizer & Disinfectant Wipes", category: "health", packed: false, essential: false },
  { id: "hlth_3", name: "Travel Toothbrush & Toiletries Kit", category: "health", packed: false, essential: true },
  { id: "hlth_4", name: "Sunscreen & Lip Balm", category: "health", packed: false, essential: false },

  // Essentials
  { id: "es_1", name: "Credit/Debit Cards & Local Cash", category: "essentials", packed: false, essential: true },
  { id: "es_2", name: "Reusable Water Bottle", category: "essentials", packed: false, essential: false },
  { id: "es_3", name: "Compact Umbrella", category: "essentials", packed: false, essential: false },
];

export default function PackingChecklist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { tripData } = useContext(CreateTripContext);

  const destinationName =
    tripData?.locationInfo?.name ||
    tripData?.destination ||
    tripData?.tripPlan?.trip?.destination ||
    "Global Adventure";

  const storageKey = STORAGE_PREFIX + destinationName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

  const [items, setItems] = useState(DEFAULT_PACKING_ITEMS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("essentials");
  const [newItemEssential, setNewItemEssential] = useState(false);
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'unpacked' | 'packed'
  const [recommendModalVisible, setRecommendModalVisible] = useState(false);
  // Android back closes the in-page form instead of leaving the screen
  useBackDismiss(modalVisible, () => setModalVisible(false));
  useBackDismiss(recommendModalVisible, () => setRecommendModalVisible(false));
  const [selectedRecIds, setSelectedRecIds] = useState([]);
  const [recCategoryFilter, setRecCategoryFilter] = useState("all");
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Load persisted items
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingItems(true);
      setLoadError(false);
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!cancelled && Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        }
      } catch (e) {
        console.warn("Could not load packing items:", e);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey, reloadKey]);

  // Persist items on modification
  const saveItems = async (updated) => {
    setItems(updated);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save packing items:", e);
    }
  };

  const triggerHaptic = (style = "Light") => tapHaptic(style);

  // Toggle item packed status
  const toggleItem = (id) => {
    triggerHaptic("Light");
    const updated = items.map((it) => (it.id === id ? { ...it, packed: !it.packed } : it));
    saveItems(updated);
  };

  // Delete item
  const deleteItem = (id) => {
    triggerHaptic("Medium");
    const updated = items.filter((it) => it.id !== id);
    saveItems(updated);
  };

  // Add custom item
  const handleAddItem = () => {
    if (!newItemName.trim()) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Please enter what you want to pack.");
      } else {
        Alert.alert("Item Name Required", "Please enter what you want to pack.");
      }
      return;
    }
    triggerHaptic("Medium");
    const newItem = {
      id: "custom_" + Date.now(),
      name: newItemName.trim(),
      category: newItemCategory,
      packed: false,
      essential: newItemEssential,
    };
    saveItems([newItem, ...items]);
    setNewItemName("");
    setNewItemCategory("essentials");
    setNewItemEssential(false);
    setModalVisible(false);
  };

  // Check if all items are packed
  const allPacked = items.length > 0 && items.every((it) => it.packed);

  // Toggle Select All / Deselect All
  const handleToggleSelectAll = () => {
    triggerHaptic("Medium");
    const targetState = !allPacked;
    const updated = items.map((it) => ({ ...it, packed: targetState }));
    saveItems(updated);
  };

  // Reset checklist (Uncheck all)
  const handleResetChecklist = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Uncheck all items? This will mark all items as unpacked.")) {
        triggerHaptic("Heavy");
        const reset = items.map((it) => ({ ...it, packed: false }));
        saveItems(reset);
      }
      return;
    }

    Alert.alert(
      "Uncheck All Items?",
      "This will mark all items as unpacked so you can pack for your next journey.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Uncheck All",
          style: "destructive",
          onPress: () => {
            triggerHaptic("Heavy");
            const reset = items.map((it) => ({ ...it, packed: false }));
            saveItems(reset);
          },
        },
      ]
    );
  };

  // Open Recommended Essentials Modal
  const handleOpenRecommendations = () => {
    triggerHaptic("Light");
    const existingNames = new Set(items.map((i) => i.name.toLowerCase().trim()));
    const missingIds = DEFAULT_PACKING_ITEMS.filter(
      (rec) => !existingNames.has(rec.name.toLowerCase().trim())
    ).map((rec) => rec.id);
    setSelectedRecIds(missingIds);
    setRecCategoryFilter("all");
    setRecommendModalVisible(true);
  };

  const toggleRecSelection = (recId) => {
    triggerHaptic("Light");
    setSelectedRecIds((prev) =>
      prev.includes(recId) ? prev.filter((id) => id !== recId) : [...prev, recId]
    );
  };

  const handleAddSelectedRecommendations = () => {
    if (selectedRecIds.length === 0) {
      setRecommendModalVisible(false);
      return;
    }
    triggerHaptic("Medium");
    const existingNames = new Set(items.map((i) => i.name.toLowerCase().trim()));
    const toAdd = DEFAULT_PACKING_ITEMS.filter(
      (rec) =>
        selectedRecIds.includes(rec.id) &&
        !existingNames.has(rec.name.toLowerCase().trim())
    ).map((rec) => ({
      ...rec,
      id: "rec_item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      packed: false,
    }));

    if (toAdd.length > 0) {
      const updated = [...items, ...toAdd];
      saveItems(updated);
    }
    setRecommendModalVisible(false);
  };

  const handleAddAllMissingRecommendations = () => {
    triggerHaptic("Heavy");
    const existingNames = new Set(items.map((i) => i.name.toLowerCase().trim()));
    const missing = DEFAULT_PACKING_ITEMS.filter(
      (rec) => !existingNames.has(rec.name.toLowerCase().trim())
    ).map((rec) => ({
      ...rec,
      id: "rec_item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      packed: false,
    }));

    if (missing.length > 0) {
      const updated = [...items, ...missing];
      saveItems(updated);
    }
    setRecommendModalVisible(false);
  };

  // Share checklist (Supports Web Navigator Share, Native Share & Clipboard Fallback)
  const handleShareChecklist = async () => {
    triggerHaptic("Light");
    const total = items.length;
    const packed = items.filter((i) => i.packed).length;

    let text = `🧳 GOGUIDE PACKING CHECKLIST for ${destinationName}\n`;
    text += `Progress: ${packed}/${total} items packed (${Math.round((packed / (total || 1)) * 100)}%)\n\n`;

    const groups = ["documents", "clothes", "electronics", "health", "essentials"];
    groups.forEach((cat) => {
      const catItems = items.filter((it) => it.category === cat);
      if (catItems.length > 0) {
        text += `[${cat.toUpperCase()}]\n`;
        catItems.forEach((it) => {
          text += `${it.packed ? "✅" : "⬜"} ${it.name}${it.essential ? " (Essential)" : ""}\n`;
        });
        text += "\n";
      }
    });

    try {
      // 1. Web Native Share API (Mobile Chrome / Safari / Edge)
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `Packing List - ${destinationName}`,
          text: text,
        });
        return;
      }

      // 2. Mobile Native Share (iOS / Android React Native)
      if (Platform.OS !== "web") {
        await Share.share({ message: text, title: `Packing List - ${destinationName}` });
        return;
      }

      // 3. Web Clipboard Fallback (Desktop / Browser where navigator.share is restricted)
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        Alert.alert(
          "Checklist Copied! 📋",
          "Your complete packing checklist has been copied to your clipboard. You can paste it directly into WhatsApp or Messages!"
        );
        return;
      }

      // 4. Fallback Share.share
      await Share.share({ message: text, title: `Packing List - ${destinationName}` });
    } catch (e) {
      if (e?.name !== "AbortError") {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            Alert.alert("Checklist Copied! 📋", "Your checklist was copied to clipboard.");
          }
        } catch (copyErr) {
          console.log("Error sharing checklist:", e);
        }
      }
    }
  };

  // Computed metrics
  const totalCount = items.length;
  const packedCount = items.filter((i) => i.packed).length;
  const unpackedCount = totalCount - packedCount;
  const progressPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  // Items matching current active category
  const currentCategoryItems = useMemo(() => {
    return activeCategory === "all"
      ? items
      : items.filter((it) => it.category === activeCategory);
  }, [items, activeCategory]);

  const catTotalCount = currentCategoryItems.length;
  const catPackedCount = currentCategoryItems.filter((i) => i.packed).length;
  const catUnpackedCount = catTotalCount - catPackedCount;

  // Filtered Items for FlatList
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;
      if (!categoryMatch) return false;

      if (filterMode === "unpacked") return !item.packed;
      if (filterMode === "packed") return item.packed;
      return true;
    });
  }, [items, activeCategory, filterMode]);

  const onAccent = lightTheme.card;
  const SUCCESS = Colors.SUCCESS;
  const DANGER = Colors.ERROR;
  const catIcon = (id) => CATEGORIES.find((c) => c.id === id)?.icon || "bag-handle-outline";
  const listBottom = insets.bottom + 84;

  // ---- Add item: full-screen view (replaces modal) ----
  if (modalVisible) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Add Luggage Item" subtitle={destinationName} onBack={() => setModalVisible(false)} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.formContent, { paddingBottom: listBottom }]}
            showsVerticalScrollIndicator={false}
          >
            <FadeInView index={0} style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>ITEM NAME</Text>
              <TextInput
                accessibilityLabel="Item name"
                style={[styles.textInput, { backgroundColor: theme.input, color: theme.inputText, borderColor: theme.border }]}
                placeholder="e.g. Swimwear, International Driving Permit"
                placeholderTextColor={theme.subtext}
                value={newItemName}
                onChangeText={setNewItemName}
                returnKeyType="done"
                onSubmitEditing={handleAddItem}
                maxFontSizeMultiplier={1.3}
                autoFocus
              />

              <Text style={[styles.inputLabel, { color: theme.subtext, marginTop: Spacing.lg }]} maxFontSizeMultiplier={1.3}>CATEGORY</Text>
              <View style={styles.modalCategoryRow} accessibilityRole="radiogroup">
                {CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
                  const active = newItemCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      accessibilityRole="radio"
                      accessibilityLabel={cat.label}
                      accessibilityState={{ selected: active, checked: active }}
                      onPress={() => {
                        triggerHaptic("Light");
                        setNewItemCategory(cat.id);
                      }}
                      style={[
                        styles.modalCatChip,
                        active
                          ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
                          : { backgroundColor: theme.bg, borderColor: theme.border },
                      ]}
                    >
                      {active ? <Ionicons name="checkmark" size={14} color={onAccent} /> : null}
                      <Text style={[styles.modalCatText, { color: active ? onAccent : theme.text }]} maxFontSizeMultiplier={1.3}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityLabel="Mark as essential, high priority"
                accessibilityState={{ checked: newItemEssential }}
                onPress={() => setNewItemEssential(!newItemEssential)}
                style={styles.essentialToggleRow}
              >
                <Ionicons
                  name={newItemEssential ? "checkbox" : "square-outline"}
                  size={22}
                  color={newItemEssential ? DANGER : theme.subtext}
                />
                <Text style={[styles.essentialToggleText, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
                  Mark as Essential (High Priority)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Add to checklist"
                onPress={handleAddItem}
                style={[styles.modalSubmitBtn, { backgroundColor: Colors.PRIMARY }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalSubmitText, { color: onAccent }]} maxFontSizeMultiplier={1.3}>Add to Checklist</Text>
              </TouchableOpacity>
            </FadeInView>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ---- Recommendations: full-screen view (replaces modal) ----
  if (recommendModalVisible) {
    const recList = DEFAULT_PACKING_ITEMS.filter(
      (item) => recCategoryFilter === "all" || item.category === recCategoryFilter
    );
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader
          title="Recommendations"
          subtitle="Add essentials without losing your custom items"
          onBack={() => setRecommendModalVisible(false)}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.recChipsScroll}
          contentContainerStyle={styles.recFilterChipsRow}
        >
          {CATEGORIES.map((cat) => {
            const isActive = recCategoryFilter === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                accessibilityRole="button"
                accessibilityLabel={`Filter ${cat.label}`}
                accessibilityState={{ selected: isActive }}
                onPress={() => {
                  triggerHaptic("Light");
                  setRecCategoryFilter(cat.id);
                }}
                style={[
                  styles.recFilterChip,
                  isActive
                    ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
                    : { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[styles.recFilterChipText, { color: isActive ? onAccent : theme.text, fontFamily: isActive ? Typography.fontBold : Typography.fontMedium }]}
                  maxFontSizeMultiplier={1.3}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.formContent, { paddingBottom: listBottom }]}
          showsVerticalScrollIndicator={false}
        >
          {recList.length === 0 ? (
            <EmptyState icon="bag-check-outline" title="No recommendations here" text="Try another category." />
          ) : (
            recList.map((rec, index) => {
              const isAlreadyInList = items.some((i) => i.name.toLowerCase().trim() === rec.name.toLowerCase().trim());
              const isSelected = selectedRecIds.includes(rec.id);
              return (
                <FadeInView key={rec.id} index={index}>
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${rec.name}${rec.essential ? ", must have" : ""}${isAlreadyInList ? ", already added" : ""}`}
                    accessibilityState={{ checked: isAlreadyInList || isSelected, disabled: isAlreadyInList }}
                    disabled={isAlreadyInList}
                    onPress={() => toggleRecSelection(rec.id)}
                    activeOpacity={isAlreadyInList ? 1 : 0.7}
                    style={[
                      styles.recItemCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: isSelected && !isAlreadyInList ? Colors.PRIMARY : theme.border,
                        opacity: isAlreadyInList ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View style={styles.recItemLeft}>
                      <View style={[styles.recCategoryDot, { backgroundColor: theme.badgeBg }]}>
                        <Ionicons name={catIcon(rec.category)} size={16} color={Colors.PRIMARY} />
                      </View>
                      <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                        <Text style={[styles.recItemName, { color: theme.text }]} maxFontSizeMultiplier={1.3}>{rec.name}</Text>
                        <View style={styles.recMetaRow}>
                          <Text style={[styles.recItemCat, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>{rec.category.toUpperCase()}</Text>
                          {rec.essential && (
                            <View style={[styles.statusPill, { backgroundColor: theme.badgeBg }]}>
                              <Ionicons name="alert-circle" size={12} color={DANGER} />
                              <Text style={[styles.statusPillText, { color: DANGER }]} maxFontSizeMultiplier={1.3}>Must Have</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {isAlreadyInList ? (
                      <View style={[styles.statusPill, { backgroundColor: theme.badgeBg }]}>
                        <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                        <Text style={[styles.statusPillText, { color: SUCCESS }]} maxFontSizeMultiplier={1.3}>Added</Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.recCheckbox,
                          {
                            backgroundColor: isSelected ? Colors.PRIMARY : "transparent",
                            borderColor: isSelected ? Colors.PRIMARY : theme.subtext,
                          },
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color={onAccent} />}
                      </View>
                    )}
                  </TouchableOpacity>
                </FadeInView>
              );
            })
          )}

          <View style={styles.recActionsFooter}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Add ${selectedRecIds.length} selected items`}
              onPress={handleAddSelectedRecommendations}
              style={[styles.recSubmitBtn, { backgroundColor: Colors.PRIMARY, opacity: selectedRecIds.length === 0 ? 0.6 : 1 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={onAccent} style={{ marginRight: 6 }} />
              <Text style={[styles.recSubmitBtnText, { color: onAccent }]} maxFontSizeMultiplier={1.3}>
                Add Selected ({selectedRecIds.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add all missing essentials"
              onPress={handleAddAllMissingRecommendations}
              style={[styles.recAddAllBtn, { borderColor: theme.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.recAddAllBtnText, { color: Colors.PRIMARY }]} maxFontSizeMultiplier={1.3}>Add All Missing Essentials</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const listHeader = (
    <View>
      <FadeInView index={0} style={[styles.progressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.progressRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.progressTitle, { color: theme.text }]} maxFontSizeMultiplier={1.3}>Luggage Progress</Text>
            <Text style={[styles.progressSubtitle, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
              {packedCount} of {totalCount} items ready ({progressPercent}%)
            </Text>
          </View>
          <View style={[styles.percentPill, { backgroundColor: theme.badgeBg }]}>
            <Text style={[styles.percentText, { color: progressPercent === 100 ? SUCCESS : Colors.PRIMARY }]} maxFontSizeMultiplier={1.3}>
              {progressPercent === 100 ? "Ready 🚀" : `${progressPercent}%`}
            </Text>
          </View>
        </View>

        <View
          style={[styles.track, { backgroundColor: theme.border }]}
          accessibilityRole="progressbar"
          accessibilityLabel="Packing progress"
          accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
        >
          <View style={[styles.fill, { width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? SUCCESS : Colors.PRIMARY }]} />
        </View>

        <View style={[styles.subActionRow, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={allPacked ? "Uncheck all items" : "Select all items"}
            onPress={handleToggleSelectAll}
            style={styles.subActionBtn}
          >
            <Ionicons name={allPacked ? "close-circle-outline" : "checkmark-done-circle"} size={16} color={allPacked ? DANGER : SUCCESS} />
            <Text style={[styles.subActionText, { color: allPacked ? DANGER : SUCCESS, fontFamily: Typography.fontBold }]} maxFontSizeMultiplier={1.3}>
              {allPacked ? "Uncheck All" : "Select All"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reset checklist" onPress={handleResetChecklist} style={styles.subActionBtn}>
            <Ionicons name="refresh-outline" size={16} color={theme.subtext} />
            <Text style={[styles.subActionText, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Recommended items" onPress={handleOpenRecommendations} style={styles.subActionBtn}>
            <Ionicons name="sparkles-outline" size={16} color={Colors.PRIMARY} />
            <Text style={[styles.subActionText, { color: Colors.PRIMARY }]} maxFontSizeMultiplier={1.3}>Recommended</Text>
          </TouchableOpacity>
        </View>
      </FadeInView>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        style={styles.categoryScrollWrap}
        contentContainerStyle={styles.categoryListContainer}
        renderItem={({ item }) => {
          const isActive = activeCategory === item.id;
          const catItems = item.id === "all" ? items : items.filter((i) => i.category === item.id);
          const packedInCat = catItems.filter((i) => i.packed).length;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${packedInCat} of ${catItems.length} packed`}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                triggerHaptic("Light");
                setActiveCategory(item.id);
              }}
              style={[
                styles.categoryPill,
                isActive
                  ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
                  : { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Ionicons name={item.icon} size={16} color={isActive ? onAccent : theme.text} style={{ marginRight: 6 }} />
              <Text
                style={[styles.categoryPillText, { color: isActive ? onAccent : theme.text, fontFamily: isActive ? Typography.fontBold : Typography.fontMedium }]}
                maxFontSizeMultiplier={1.3}
              >
                {item.label}
              </Text>
              <View style={[styles.categoryBadge, { backgroundColor: isActive ? "rgba(255, 255, 255, 0.25)" : theme.badgeBg }]}>
                <Text style={[styles.categoryBadgeText, { color: isActive ? onAccent : theme.subtext }]} maxFontSizeMultiplier={1.3}>
                  {`${packedInCat}/${catItems.length}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={[styles.filterModeRow, { borderBottomColor: theme.border }]}>
        <View style={styles.filterTabsWrap}>
          {[
            { id: "all", label: "ALL", showCount: false },
            { id: "unpacked", label: "UNPACKED", showCount: false },
            { id: "packed", label: "PACKED", showCount: true, count: catPackedCount },
          ].map((tab) => {
            const isTabActive = filterMode === tab.id;
            const tabColor = tab.id === "packed" ? SUCCESS : Colors.PRIMARY;
            return (
              <TouchableOpacity
                key={tab.id}
                accessibilityRole="tab"
                accessibilityLabel={`${tab.label.toLowerCase()} items`}
                accessibilityState={{ selected: isTabActive }}
                onPress={() => {
                  triggerHaptic("Light");
                  setFilterMode(tab.id);
                }}
                style={[styles.filterModeBtn, isTabActive && { borderBottomColor: tabColor, borderBottomWidth: 2 }]}
              >
                <View style={styles.filterTabInner}>
                  <Text
                    style={[styles.filterModeText, { color: isTabActive ? tabColor : theme.subtext, fontFamily: isTabActive ? Typography.fontBold : Typography.fontMedium }]}
                    maxFontSizeMultiplier={1.3}
                  >
                    {tab.label}
                  </Text>
                  {tab.showCount && (
                    <View style={[styles.filterBadgePill, { backgroundColor: theme.badgeBg }]}>
                      <Text style={[styles.filterBadgeText, { color: isTabActive ? SUCCESS : theme.subtext }]} maxFontSizeMultiplier={1.3}>
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="Packing Checklist"
        subtitle={destinationName}
        onBack={() => {
          triggerHaptic("Light");
          router.back();
        }}
        rightAction={
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Share checklist"
              onPress={handleShareChecklist}
              style={[styles.iconActionBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
            >
              <Ionicons name="share-outline" size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add item"
              onPress={() => setModalVisible(true)}
              style={[styles.iconActionBtn, { backgroundColor: Colors.PRIMARY }]}
            >
              <Ionicons name="add" size={22} color={onAccent} />
            </TouchableOpacity>
          </View>
        }
      />

      {loadingItems ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={110} radius={Radius.card} />
          <Skeleton height={44} radius={Radius.pill} />
          <Skeleton height={64} radius={Radius.card} />
          <Skeleton height={64} radius={Radius.card} />
          <Skeleton height={64} radius={Radius.card} />
        </View>
      ) : loadError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load your checklist"
          text="Your saved packing list could not be read. Try again or continue with the default list."
          actionLabel="Try again"
          onAction={() => setReloadKey((k) => k + 1)}
          secondaryLabel="Use default list"
          onSecondary={() => setLoadError(false)}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.itemsListContainer, { paddingBottom: listBottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon="bag-check-outline"
              title="No items found"
              text={
                filterMode === "unpacked"
                  ? "All items in this section are packed! 🎉"
                  : "Add custom items to your packing list."
              }
              actionLabel="Add item"
              onAction={() => setModalVisible(true)}
            />
          }
          renderItem={({ item, index }) => (
            <FadeInView
              index={index}
              style={[styles.itemRow, { backgroundColor: theme.card, borderColor: theme.border, opacity: item.packed ? 0.8 : 1 }]}
            >
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityLabel={`${item.name}${item.essential ? ", must have" : ""}`}
                accessibilityState={{ checked: item.packed }}
                onPress={() => toggleItem(item.id)}
                style={styles.checkboxTouchable}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    item.packed
                      ? { backgroundColor: SUCCESS, borderColor: SUCCESS }
                      : { borderColor: theme.subtext, backgroundColor: "transparent" },
                  ]}
                >
                  {item.packed && <Ionicons name="checkmark" size={16} color={onAccent} />}
                </View>

                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                    {item.name}
                  </Text>
                  <View style={styles.itemBadgeRow}>
                    <Text style={[styles.itemCategoryBadge, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>
                      {item.category.toUpperCase()}
                    </Text>
                    {item.packed ? (
                      <View style={[styles.statusPill, { backgroundColor: theme.badgeBg }]}>
                        <Ionicons name="checkmark-circle" size={12} color={SUCCESS} />
                        <Text style={[styles.statusPillText, { color: SUCCESS }]} maxFontSizeMultiplier={1.3}>Packed</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusPill, { backgroundColor: theme.badgeBg }]}>
                        <Ionicons name="time-outline" size={12} color={theme.subtext} />
                        <Text style={[styles.statusPillText, { color: theme.subtext }]} maxFontSizeMultiplier={1.3}>To Pack</Text>
                      </View>
                    )}
                    {item.essential && (
                      <View style={[styles.statusPill, { backgroundColor: theme.badgeBg }]}>
                        <Ionicons name="alert-circle" size={12} color={DANGER} />
                        <Text style={[styles.statusPillText, { color: DANGER }]} maxFontSizeMultiplier={1.3}>Must Have</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
                onPress={() => deleteItem(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.subtext} />
              </TouchableOpacity>
            </FadeInView>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconActionBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonWrap: { padding: Spacing.gutter, gap: Spacing.md },
  progressCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  progressTitle: { fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  progressSubtitle: { fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, marginTop: 3 },
  percentPill: { paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: Radius.md },
  percentText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontBold },
  track: { height: 8, borderRadius: Radius.xs, marginTop: Spacing.md, overflow: "hidden" },
  fill: { height: "100%", borderRadius: Radius.xs },
  subActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
  },
  subActionText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium, marginLeft: 5 },
  categoryScrollWrap: { marginTop: Spacing.md, marginHorizontal: -Spacing.gutter },
  categoryListContainer: { paddingHorizontal: Spacing.gutter, gap: Spacing.sm },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  categoryPillText: { fontSize: Typography.sizeMd },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.md, marginLeft: 6 },
  categoryBadgeText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  filterModeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterTabsWrap: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  filterModeBtn: { minHeight: 44, justifyContent: "center", marginRight: Spacing.lg },
  filterTabInner: { flexDirection: "row", alignItems: "center", gap: 5 },
  filterModeText: { fontSize: Typography.sizeSm, letterSpacing: 0.5 },
  filterBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.md,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, includeFontPadding: false },
  itemsListContainer: {
    paddingHorizontal: Spacing.gutter,
    gap: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.card,
    borderWidth: 1,
    minHeight: 64,
  },
  checkboxTouchable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minHeight: 56,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: Radius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  itemName: { fontSize: Typography.sizeBase, fontFamily: Typography.fontMedium },
  itemBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  itemCategoryBadge: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium, letterSpacing: 0.3 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    gap: 3,
  },
  statusPillText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold },
  deleteBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  formContent: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.lg },
  formCard: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.lg },
  inputLabel: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, letterSpacing: 0.5, marginBottom: 6 },
  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizeBase,
    fontFamily: Typography.fontRegular,
  },
  modalCategoryRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  modalCatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  modalCatText: { fontSize: Typography.sizeSm, fontFamily: Typography.fontMedium },
  essentialToggleRow: { flexDirection: "row", alignItems: "center", marginTop: Spacing.lg, minHeight: 44 },
  essentialToggleText: { flex: 1, fontSize: Typography.sizeMd, fontFamily: Typography.fontRegular, marginLeft: Spacing.sm },
  modalSubmitBtn: {
    marginTop: Spacing.xl,
    minHeight: 48,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: { fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  recChipsScroll: { flexGrow: 0 },
  recFilterChipsRow: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.md,
  },
  recFilterChip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  recFilterChipText: { fontSize: Typography.sizeSm },
  recItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    minHeight: 64,
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  recItemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  recCategoryDot: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  recItemName: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
  recMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 2 },
  recItemCat: { fontSize: Typography.sizeSm, fontFamily: Typography.fontBold, letterSpacing: 0.3 },
  recCheckbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  recActionsFooter: { paddingTop: Spacing.md, gap: Spacing.sm },
  recSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: Radius.pill,
  },
  recSubmitBtnText: { fontSize: Typography.sizeBase, fontFamily: Typography.fontBold },
  recAddAllBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  recAddAllBtnText: { fontSize: Typography.sizeMd, fontFamily: Typography.fontMedium },
});
