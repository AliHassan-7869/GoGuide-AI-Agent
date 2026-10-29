import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../Components/constants/constants";
import { useTheme } from "../Components/constants/theme";
import { CreateTripContext } from "../context/CreateTripContext";

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

  const safeTopPadding = Platform.select({
    android: Math.max(insets.top, StatusBar.currentHeight || 28) + 8,
    ios: Math.max(insets.top, 44),
    default: 16,
  });

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
  const [selectedRecIds, setSelectedRecIds] = useState([]);
  const [recCategoryFilter, setRecCategoryFilter] = useState("all");

  // Load persisted items
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        }
      } catch (e) {
        console.warn("Could not load packing items:", e);
      }
    })();
  }, [storageKey]);

  // Persist items on modification
  const saveItems = async (updated) => {
    setItems(updated);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save packing items:", e);
    }
  };

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch {}
  };

  // Toggle item packed status
  const toggleItem = (id) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const updated = items.map((it) => (it.id === id ? { ...it, packed: !it.packed } : it));
    saveItems(updated);
  };

  // Delete item
  const deleteItem = (id) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
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
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
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
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const targetState = !allPacked;
    const updated = items.map((it) => ({ ...it, packed: targetState }));
    saveItems(updated);
  };

  // Reset checklist (Uncheck all)
  const handleResetChecklist = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Uncheck all items? This will mark all items as unpacked.")) {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
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
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            const reset = items.map((it) => ({ ...it, packed: false }));
            saveItems(reset);
          },
        },
      ]
    );
  };

  // Open Recommended Essentials Modal
  const handleOpenRecommendations = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const existingNames = new Set(items.map((i) => i.name.toLowerCase().trim()));
    const missingIds = DEFAULT_PACKING_ITEMS.filter(
      (rec) => !existingNames.has(rec.name.toLowerCase().trim())
    ).map((rec) => rec.id);
    setSelectedRecIds(missingIds);
    setRecCategoryFilter("all");
    setRecommendModalVisible(true);
  };

  const toggleRecSelection = (recId) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRecIds((prev) =>
      prev.includes(recId) ? prev.filter((id) => id !== recId) : [...prev, recId]
    );
  };

  const handleAddSelectedRecommendations = () => {
    if (selectedRecIds.length === 0) {
      setRecommendModalVisible(false);
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
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
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
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

  // Share checklist
  const handleShareChecklist = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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
      await Share.share({ message: text, title: `Packing List - ${destinationName}` });
    } catch (e) {
      console.log("Error sharing checklist:", e);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: safeTopPadding }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={[styles.backBtn, { backgroundColor: theme.card }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Packing Checklist</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]} numberOfLines={1}>
            {destinationName}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={handleShareChecklist}
            style={[styles.iconActionBtn, { backgroundColor: theme.card }]}
          >
            <Ionicons name="share-outline" size={18} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.iconActionBtn, { backgroundColor: Colors.PRIMARY, marginLeft: 8 }]}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Card */}
      <View style={[styles.progressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.progressRow}>
          <View>
            <Text style={[styles.progressTitle, { color: theme.text }]}>Luggage Progress</Text>
            <Text style={[styles.progressSubtitle, { color: theme.subtext }]}>
              {packedCount} of {totalCount} items ready ({progressPercent}%)
            </Text>
          </View>
          <View
            style={[
              styles.percentPill,
              { backgroundColor: progressPercent === 100 ? "#10B98122" : Colors.PRIMARY + "18" },
            ]}
          >
            <Text
              style={[
                styles.percentText,
                { color: progressPercent === 100 ? "#10B981" : Colors.PRIMARY },
              ]}
            >
              {progressPercent === 100 ? "Ready 🚀" : `${progressPercent}%`}
            </Text>
          </View>
        </View>

        {/* Progress Bar Track */}
        <View style={[styles.track, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${progressPercent}%`,
                backgroundColor: progressPercent === 100 ? "#10B981" : Colors.PRIMARY,
              },
            ]}
          />
        </View>

        {/* Action strip under progress */}
        <View style={styles.subActionRow}>
          <TouchableOpacity onPress={handleToggleSelectAll} style={styles.subActionBtn}>
            <Ionicons
              name={allPacked ? "close-circle-outline" : "checkmark-done-circle"}
              size={15}
              color={allPacked ? "#EF4444" : "#10B981"}
            />
            <Text
              style={[
                styles.subActionText,
                { color: allPacked ? "#EF4444" : "#10B981", fontFamily: "Outfit-Bold" },
              ]}
            >
              {allPacked ? "Uncheck All" : "Select All"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResetChecklist} style={styles.subActionBtn}>
            <Ionicons name="refresh-outline" size={14} color={theme.subtext} />
            <Text style={[styles.subActionText, { color: theme.subtext }]}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleOpenRecommendations} style={styles.subActionBtn}>
            <Ionicons name="sparkles-outline" size={14} color={Colors.PRIMARY} />
            <Text style={[styles.subActionText, { color: Colors.PRIMARY }]}>Recommended</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Pills Slider */}
      <View style={styles.categoryScrollWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryListContainer}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.id;
            const catItems =
              item.id === "all"
                ? items
                : items.filter((i) => i.category === item.id);
            const totalInCat = catItems.length;
            const packedInCat = catItems.filter((i) => i.packed).length;

            return (
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(item.id);
                }}
                style={[
                  styles.categoryPill,
                  isActive
                    ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
                    : { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={isActive ? "#FFF" : theme.text}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isActive ? "#FFF" : theme.text,
                      fontFamily: isActive ? "Outfit-Bold" : "Outfit-Medium",
                    },
                  ]}
                >
                  {item.label}
                </Text>
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: isActive
                        ? "rgba(255, 255, 255, 0.25)"
                        : theme.isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 0, 0, 0.05)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      { color: isActive ? "#FFF" : theme.subtext },
                    ]}
                  >
                    {item.id === "all"
                      ? `${packedCount}/${totalCount}`
                      : `${packedInCat}/${totalInCat}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Filter Mode Selector & Quick Select All Button */}
      <View style={styles.filterModeRow}>
        <View style={styles.filterTabsWrap}>
          {[
            { id: "all", label: "ALL", showCount: false },
            { id: "unpacked", label: "UNPACKED", showCount: false },
            { id: "packed", label: "PACKED", showCount: true, count: catPackedCount },
          ].map((tab) => {
            const isTabActive = filterMode === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setFilterMode(tab.id);
                }}
                style={[
                  styles.filterModeBtn,
                  isTabActive && {
                    borderBottomColor:
                      tab.id === "packed" ? "#10B981" : Colors.PRIMARY,
                    borderBottomWidth: 2,
                  },
                ]}
              >
                <View style={styles.filterTabInner}>
                  <Text
                    style={[
                      styles.filterModeText,
                      {
                        color: isTabActive
                          ? tab.id === "packed"
                            ? "#10B981"
                            : Colors.PRIMARY
                          : theme.subtext,
                        fontFamily: isTabActive ? "Outfit-Bold" : "Outfit-Medium",
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {tab.showCount && (
                    <View
                      style={[
                        styles.filterBadgePill,
                        {
                          backgroundColor: isTabActive
                            ? "rgba(16, 185, 129, 0.16)"
                            : theme.isDark
                            ? "rgba(255, 255, 255, 0.08)"
                            : "rgba(0, 0, 0, 0.05)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterBadgeText,
                          {
                            color: isTabActive ? "#10B981" : theme.subtext,
                            fontFamily: "Outfit-Bold",
                          },
                        ]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleToggleSelectAll}
          style={[
            styles.quickSelectBtn,
            {
              backgroundColor: allPacked
                ? "rgba(16, 185, 129, 0.12)"
                : theme.isDark
                ? "rgba(10, 126, 164, 0.2)"
                : "rgba(10, 126, 164, 0.1)",
              borderColor: allPacked ? "rgba(16, 185, 129, 0.35)" : "rgba(10, 126, 164, 0.3)",
            },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={allPacked ? "checkbox" : "checkmark-done-circle-outline"}
            size={13}
            color={allPacked ? "#10B981" : Colors.PRIMARY}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.quickSelectText,
              { color: allPacked ? "#10B981" : Colors.PRIMARY },
            ]}
            numberOfLines={1}
          >
            {allPacked ? "Deselect All" : "Select All"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Checklist FlatList */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.itemsListContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-check-outline" size={48} color={theme.subtext} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No items found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
              {filterMode === "unpacked"
                ? "All items in this section are packed! 🎉"
                : "Tap the + button above to add custom items to your packing list."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <View
              style={[
                styles.itemRow,
                {
                  backgroundColor: theme.card,
                  borderColor: item.packed ? theme.border : theme.border,
                  opacity: item.packed ? 0.72 : 1,
                },
              ]}
            >
              {/* Checkbox Trigger */}
              <TouchableOpacity
                onPress={() => toggleItem(item.id)}
                style={styles.checkboxTouchable}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    item.packed
                      ? { backgroundColor: "#10B981", borderColor: "#10B981" }
                      : { borderColor: theme.subtext, backgroundColor: "transparent" },
                  ]}
                >
                  {item.packed && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>

                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={[
                      styles.itemName,
                      {
                        color: theme.text,
                        textDecorationLine: item.packed ? "line-through" : "none",
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <View style={styles.itemBadgeRow}>
                    <Text style={[styles.itemCategoryBadge, { color: theme.subtext }]}>
                      {item.category.toUpperCase()}
                    </Text>
                    {item.packed ? (
                      <View style={styles.packedStatusPill}>
                        <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                        <Text style={styles.packedStatusText}>Packed</Text>
                      </View>
                    ) : (
                      <View style={styles.unpackedStatusPill}>
                        <Ionicons name="time-outline" size={10} color={theme.subtext} />
                        <Text style={[styles.unpackedStatusText, { color: theme.subtext }]}>To Pack</Text>
                      </View>
                    )}
                    {item.essential && (
                      <View style={styles.essentialPill}>
                        <Ionicons name="alert-circle" size={11} color="#EF4444" />
                        <Text style={styles.essentialText}>Must Have</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={() => deleteItem(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={16} color={theme.subtext} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Add Custom Item Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Luggage Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.subtext }]}>ITEM NAME</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="e.g. Swimwear, International Driving Permit"
              placeholderTextColor={theme.subtext}
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />

            <Text style={[styles.inputLabel, { color: theme.subtext, marginTop: 14 }]}>CATEGORY</Text>
            <View style={styles.modalCategoryRow}>
              {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setNewItemCategory(cat.id);
                  }}
                  style={[
                    styles.modalCatChip,
                    newItemCategory === cat.id
                      ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
                      : { backgroundColor: theme.bg, borderColor: theme.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalCatText,
                      { color: newItemCategory === cat.id ? "#FFF" : theme.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Essential Toggle */}
            <TouchableOpacity
              onPress={() => setNewItemEssential(!newItemEssential)}
              style={styles.essentialToggleRow}
            >
              <Ionicons
                name={newItemEssential ? "checkbox" : "square-outline"}
                size={20}
                color={newItemEssential ? "#EF4444" : theme.subtext}
              />
              <Text style={[styles.essentialToggleText, { color: theme.text }]}>
                Mark as Essential (High Priority)
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleAddItem}
              style={[styles.modalSubmitBtn, { backgroundColor: Colors.PRIMARY }]}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSubmitText}>Add to Checklist</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Recommended Essentials Selection Modal */}
      <Modal
        visible={recommendModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRecommendModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.recModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Modal Header */}
            <View style={styles.recModalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="sparkles" size={18} color={Colors.PRIMARY} />
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Curated Recommendations</Text>
                </View>
                <Text style={[styles.recModalSubtitle, { color: theme.subtext }]}>
                  Select essentials to add without losing your custom items
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRecommendModalVisible(false)}
                style={[styles.closeIconBtn, { backgroundColor: theme.isDark ? "#282828" : "#F3F4F6" }]}
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Category filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recFilterChipsRow}
            >
              {CATEGORIES.map((cat) => {
                const isActive = recCategoryFilter === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                      setRecCategoryFilter(cat.id);
                    }}
                    style={[
                      styles.recFilterChip,
                      isActive
                        ? { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY }
                        : { backgroundColor: theme.isDark ? "#252525" : "#F3F4F6", borderColor: theme.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.recFilterChipText,
                        { color: isActive ? "#FFF" : theme.text, fontFamily: isActive ? "Outfit-Bold" : "Outfit-Medium" },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* List of recommended items */}
            <ScrollView style={styles.recListScroll} showsVerticalScrollIndicator={false}>
              {DEFAULT_PACKING_ITEMS.filter(
                (item) => recCategoryFilter === "all" || item.category === recCategoryFilter
              ).map((rec) => {
                const isAlreadyInList = items.some(
                  (i) => i.name.toLowerCase().trim() === rec.name.toLowerCase().trim()
                );
                const isSelected = selectedRecIds.includes(rec.id);

                return (
                  <TouchableOpacity
                    key={rec.id}
                    disabled={isAlreadyInList}
                    onPress={() => toggleRecSelection(rec.id)}
                    activeOpacity={isAlreadyInList ? 1 : 0.7}
                    style={[
                      styles.recItemCard,
                      {
                        backgroundColor: theme.isDark ? "#202028" : "#F8FAFC",
                        borderColor: isSelected && !isAlreadyInList ? Colors.PRIMARY : theme.border,
                        opacity: isAlreadyInList ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View style={styles.recItemLeft}>
                      <View
                        style={[
                          styles.recCategoryDot,
                          {
                            backgroundColor:
                              rec.category === "documents"
                                ? "#3B82F620"
                                : rec.category === "electronics"
                                ? "#8B5CF620"
                                : rec.category === "health"
                                ? "#EF444420"
                                : "#10B98120",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            rec.category === "documents"
                              ? "document-text-outline"
                              : rec.category === "electronics"
                              ? "hardware-chip-outline"
                              : rec.category === "health"
                              ? "medkit-outline"
                              : "bag-handle-outline"
                          }
                          size={16}
                          color={
                            rec.category === "documents"
                              ? "#3B82F6"
                              : rec.category === "electronics"
                              ? "#8B5CF6"
                              : rec.category === "health"
                              ? "#EF4444"
                              : "#10B981"
                          }
                        />
                      </View>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.recItemName, { color: theme.text }]} numberOfLines={1}>
                          {rec.name}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <Text style={[styles.recItemCat, { color: theme.subtext }]}>
                            {rec.category.toUpperCase()}
                          </Text>
                          {rec.essential && (
                            <View style={styles.recEssentialBadge}>
                              <Ionicons name="sparkles" size={9} color="#EF4444" />
                              <Text style={styles.recEssentialText}>Must Have</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Right side status / Checkbox */}
                    {isAlreadyInList ? (
                      <View style={styles.recAlreadyAddedPill}>
                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                        <Text style={styles.recAlreadyAddedText}>Added</Text>
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
                        {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.recActionsFooter}>
              <TouchableOpacity
                onPress={handleAddSelectedRecommendations}
                style={[
                  styles.recSubmitBtn,
                  {
                    backgroundColor: Colors.PRIMARY,
                    opacity: selectedRecIds.length === 0 ? 0.6 : 1,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.recSubmitBtnText}>
                  Add Selected ({selectedRecIds.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddAllMissingRecommendations}
                style={[styles.recAddAllBtn, { borderColor: theme.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.recAddAllBtnText, { color: Colors.PRIMARY }]}>
                  Add All Missing Essentials
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  progressSubtitle: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 3,
  },
  percentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentText: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  track: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  subActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150, 150, 150, 0.2)",
  },
  subActionBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  subActionText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
    marginLeft: 5,
  },
  categoryScrollWrap: {
    marginTop: 14,
  },
  categoryListContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    marginLeft: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  filterModeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  filterTabsWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  filterModeBtn: {
    paddingVertical: 8,
    marginRight: 14,
  },
  filterTabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  filterModeText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  filterBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    includeFontPadding: false,
  },
  quickSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
    flexShrink: 0,
  },
  quickSelectText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
  },
  itemsListContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkboxTouchable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontFamily: "Outfit-Medium",
  },
  itemBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  itemCategoryBadge: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
    letterSpacing: 0.3,
  },
  packedStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 3,
  },
  packedStatusText: {
    color: "#10B981",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  unpackedStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(150, 150, 150, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 3,
  },
  unpackedStatusText: {
    fontSize: 10,
    fontFamily: "Outfit-Medium",
  },
  essentialPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  essentialText: {
    color: "#EF4444",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    marginLeft: 3,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Outfit-Regular",
  },
  modalCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalCatText: {
    fontSize: 12,
    fontFamily: "Outfit-Medium",
  },
  essentialToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  essentialToggleText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    marginLeft: 8,
  },
  modalSubmitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  recModalCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    padding: 20,
    maxHeight: "82%",
  },
  recModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recModalSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  recFilterChipsRow: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 10,
  },
  recFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  recFilterChipText: {
    fontSize: 12,
  },
  recListScroll: {
    maxHeight: 320,
    marginVertical: 4,
  },
  recItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  recItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recCategoryDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  recItemName: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
  recItemCat: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.3,
  },
  recEssentialBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 2,
  },
  recEssentialText: {
    color: "#EF4444",
    fontSize: 9,
    fontFamily: "Outfit-Bold",
  },
  recAlreadyAddedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  recAlreadyAddedText: {
    color: "#10B981",
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  recCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  recActionsFooter: {
    paddingTop: 12,
    gap: 8,
  },
  recSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
  },
  recSubmitBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Outfit-Bold",
  },
  recAddAllBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  recAddAllBtnText: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
});
