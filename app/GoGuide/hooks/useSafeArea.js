import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Dynamic system-chrome padding; replaces hardcoded top/bottom paddings. */
export function useSafeArea(extraTop = 0, extraBottom = 0) {
  const insets = useSafeAreaInsets();
  return {
    insets,
    paddingTop: insets.top + extraTop,
    paddingBottom: insets.bottom + extraBottom,
    topStyle: { paddingTop: insets.top + extraTop },
    bottomStyle: { paddingBottom: insets.bottom + extraBottom },
  };
}

export default useSafeArea;
