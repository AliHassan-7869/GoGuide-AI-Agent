import React, { useRef, useCallback } from "react";
import { Pressable, StyleSheet } from "react-native";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

/**
 * Drop-in replacement for TouchableOpacity built on Pressable.
 * Adds Android ripple, 10dp hitSlop and opacity feedback on iOS/web.
 * Supports `activeOpacity`, `disabled`, `style` (object/array/function).
 */
const Touchable = React.forwardRef(function Touchable(
  { activeOpacity = 0.7, style, children, hitSlop, android_ripple, disabled, onPress, ...rest },
  ref
) {
  // Ignore taps while an async onPress is still running (prevents duplicate submits).
  const busy = useRef(false);
  const guardedPress = useCallback(
    (e) => {
      if (busy.current || !onPress) return;
      try {
        const result = onPress(e);
        if (result && typeof result.then === "function") {
          busy.current = true;
          const release = () => {
            busy.current = false;
          };
          result.then(release, release);
        }
      } catch (err) {
        busy.current = false;
        throw err;
      }
    },
    [onPress]
  );

  return (
    <Pressable
      ref={ref}
      disabled={disabled}
      onPress={onPress ? guardedPress : undefined}
      hitSlop={hitSlop ?? HIT_SLOP}
      android_ripple={android_ripple ?? { color: "rgba(0, 0, 0, 0.1)", borderless: false }}
      accessibilityRole={rest.accessibilityRole ?? "button"}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        state.pressed && !android_ripple ? { opacity: activeOpacity } : null,
        disabled ? styles.disabled : null,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
});

const styles = StyleSheet.create({ disabled: { opacity: 0.5 } });

export const TouchableOpacity = Touchable;
export default Touchable;
