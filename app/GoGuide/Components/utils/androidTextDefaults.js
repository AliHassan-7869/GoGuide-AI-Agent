import { Platform, Text, TextInput } from "react-native";

const MAX_SCALE = 1.3;
let installed = false;

function patchTextInput() {
  const original = TextInput?.render;
  if (typeof original !== "function") return;
  TextInput.render = function patchedInputRender(props, ref) {
    const multiline = !!props?.multiline;
    const isSearch = /search/i.test(String(props?.placeholder || ""));
    const next = {
      ...props,
      maxFontSizeMultiplier: props?.maxFontSizeMultiplier ?? MAX_SCALE,
      returnKeyType: props?.returnKeyType ?? (multiline ? undefined : isSearch ? "search" : "done"),
      textAlignVertical: props?.textAlignVertical ?? (multiline ? "top" : undefined),
      style: [
        { minHeight: 48 },
        Platform.OS === "android" ? { includeFontPadding: false } : null,
        props?.style,
      ],
    };
    return original.call(this, next, ref);
  };
}

function patch(Component, extraStyle) {
  const original = Component?.render;
  if (typeof original !== "function") return;
  Component.render = function patchedRender(props, ref) {
    const next = {
      ...props,
      maxFontSizeMultiplier: props?.maxFontSizeMultiplier ?? MAX_SCALE,
      style: [extraStyle, props?.style],
    };
    return original.call(this, next, ref);
  };
}

/** Global Android typography safety: no extra font padding + capped system font scaling. */
export function installAndroidTextDefaults() {
  if (installed) return;
  installed = true;
  try {
    patch(Text, Platform.OS === "android" ? { includeFontPadding: false } : null);
    patchTextInput();
  } catch (e) {
    console.warn("[androidTextDefaults] skipped:", e?.message);
  }
}
