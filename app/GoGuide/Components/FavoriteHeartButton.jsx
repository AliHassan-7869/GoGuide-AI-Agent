import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  getFavoritePlaces,
  subscribeToFavorites,
  toggleFavoritePlace,
} from "./utils/FavoriteService";

import { TouchableOpacity } from "./ui/Touchable";
export default function FavoriteHeartButton({
  item,
  place,
  size = 18,
  style,
  inactiveColor = "#FFFFFF",
  variant = "overlay", // "overlay" (for images) or "inline" (for vibe cards)
}) {
  const [isFav, setIsFav] = useState(false);

  const rawTarget = item || place;
  const itemKey = String(rawTarget?.id || rawTarget?.name || rawTarget?.title || "")
    .toLowerCase()
    .trim();

  useEffect(() => {
    let mounted = true;

    const checkList = (favs) => {
      if (!mounted || !itemKey) return;
      const match = (favs || []).some(
        (f) =>
          (f.id && String(f.id).toLowerCase().trim() === itemKey) ||
          (f.name && String(f.name).toLowerCase().trim() === itemKey) ||
          (f.title && String(f.title).toLowerCase().trim() === itemKey)
      );
      setIsFav(match);
    };

    getFavoritePlaces().then(checkList).catch(() => {});
    const unsubscribe = subscribeToFavorites(checkList);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [itemKey]);

  const handlePress = async (e) => {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    if (!rawTarget) return;
    setIsFav((prev) => !prev);
    const normalizedItem = {
      ...rawTarget,
      id: rawTarget.id || rawTarget.name || rawTarget.title,
      name: rawTarget.name || rawTarget.title || "Scenic Place",
      title: rawTarget.title || rawTarget.name || "Scenic Place",
      image: rawTarget.image || rawTarget.img || rawTarget.photoRef,
      category: rawTarget.category || rawTarget.tag || "Must Visit",
      description: rawTarget.description || rawTarget.desc || "Top rated destination to explore",
    };
    await toggleFavoritePlace(normalizedItem);
  };

  const flattened = StyleSheet.flatten(style) || {};
  const hasCustomBottom = flattened.bottom !== undefined;
  const hasCustomLeft = flattened.left !== undefined;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        variant === "overlay" ? styles.overlayBtn : styles.inlineBtn,
        variant === "overlay" && hasCustomBottom && { top: undefined },
        variant === "overlay" && hasCustomLeft && { right: undefined },
        isFav && variant === "overlay" && styles.overlayBtnActive,
        style,
      ]}
      accessibilityLabel={isFav ? "Remove from Favorites" : "Add to Favorites"}
    >
      <Ionicons
        name={isFav ? "heart" : "heart-outline"}
        size={size}
        color={isFav ? "#EF4444" : inactiveColor}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlayBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    zIndex: 50,
    elevation: 8,
  },
  overlayBtnActive: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  inlineBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(150, 150, 150, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});

