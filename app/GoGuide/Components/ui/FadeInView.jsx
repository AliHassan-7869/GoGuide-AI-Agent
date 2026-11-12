import React, { useEffect, useMemo } from "react";
import { Animated, Easing, Platform } from "react-native";
import useReduceMotion from "../../hooks/useReduceMotion";

const STAGGER_MS = 40;
const DURATION_MS = 230;
const RISE_PX = 10;

/**
 * Staggered entry: fades in while rising 10px. Pass `index` for a 40ms-per-item stagger
 * (capped so long lists do not wait). Skips the motion when reduce-motion is on.
 */
export default function FadeInView({ index = 0, delay = 0, style, children, ...rest }) {
  const reduce = useReduceMotion();
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return undefined;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      delay: delay + Math.min(index, 10) * STAGGER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    anim.start();
    return () => anim.stop();
  }, [reduce, progress]);

  return (
    <Animated.View
      {...rest}
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [RISE_PX, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
