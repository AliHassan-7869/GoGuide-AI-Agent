import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";
import { keyboardTopFromEvent, overlapFor, webOverlap } from "../Components/utils/keyboardOverlap";

const SETTLE_DELAYS_MS = [0, 150, 400]; // the window may still be resizing right after the keyboard event

/**
 * Android chat-bar docking. Returns { overlap, onLayout }: put `ref` + `onLayout` on the view that holds the
 * list and the input bar, and give that view `paddingBottom: overlap`. When the keyboard opens the bar is
 * lifted by exactly the part of the view that the keyboard covers (0 if the window already resized).
 * On the web (mobile browsers) it uses the visual viewport instead. iOS uses KeyboardAvoidingView, so the hook is off there.
 */
export function useKeyboardOverlap(containerRef, { enabled = Platform.OS === "android" || Platform.OS === "web", onChange } = {}) {
  const [overlap, setOverlap] = useState(0);
  const keyboardTopRef = useRef(null);
  const timersRef = useRef([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const measure = useCallback(() => {
    const node = containerRef.current;
    if (keyboardTopRef.current == null || !node || typeof node.measureInWindow !== "function") return;
    node.measureInWindow((_x, y, _w, h) => {
      setOverlap((prev) => {
        const next = overlapFor(y + h, keyboardTopRef.current);
        return next === prev ? prev : next;
      });
    });
  }, [containerRef]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (Platform.OS === "web") {
      const vv = typeof window !== "undefined" ? window.visualViewport : null;
      if (!vv) return undefined;
      const update = () => {
        const node = containerRef.current;
        const rect = node && typeof node.getBoundingClientRect === "function" ? node.getBoundingClientRect() : null;
        const next = webOverlap({
          innerHeight: window.innerHeight,
          height: vv.height,
          offsetTop: vv.offsetTop,
          scale: vv.scale,
          containerBottom: rect ? rect.bottom : undefined,
        });
        setOverlap((prev) => (prev === next ? prev : next));
      };
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
      update();
      return () => {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      };
    }
    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardTopRef.current = keyboardTopFromEvent(event, Dimensions.get("screen").height);
      clearTimers();
      timersRef.current = SETTLE_DELAYS_MS.map((ms) => setTimeout(measure, ms));
      if (onChangeRef.current) timersRef.current.push(setTimeout(() => onChangeRef.current(true), 80));
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTopRef.current = null;
      clearTimers();
      setOverlap(0);
      if (onChangeRef.current) onChangeRef.current(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      clearTimers();
    };
  }, [enabled, measure, containerRef]);

  return { overlap: enabled ? overlap : 0, onLayout: enabled && Platform.OS !== "web" ? measure : undefined };
}

export default useKeyboardOverlap;
