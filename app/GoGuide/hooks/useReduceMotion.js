import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** True when the OS "reduce motion" setting is on. Animations should skip or shorten. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => mounted && setReduce(Boolean(v)))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => setReduce(Boolean(v)));
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

export default useReduceMotion;
