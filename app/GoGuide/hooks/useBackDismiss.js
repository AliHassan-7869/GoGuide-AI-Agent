import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";

/**
 * Android hardware back: when `visible` is true, back closes the modal/sheet
 * (calls onClose) instead of popping the screen / exiting the app.
 */
export function useBackDismiss(visible, onClose) {
  useEffect(() => {
    if (Platform.OS !== "android" || !visible) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      try {
        onClose?.();
      } catch (e) {
        console.warn("[useBackDismiss]", e);
      }
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);
}

export default useBackDismiss;
