import { Alert, Platform } from "react-native";

let installed = false;

/**
 * React Native Web ships `Alert.alert` as an empty function, so every Alert in the app
 * (confirmations, errors, success notices) silently did nothing on the website.
 * On web only, route Alert.alert to the browser's own dialogs:
 *  - 0-1 buttons  -> window.alert, then that button's onPress
 *  - 2+ buttons   -> window.confirm: OK runs the first non-cancel button, Cancel runs the cancel button
 * Native platforms are untouched.
 */
export function installWebAlert() {
  if (installed || Platform.OS !== "web" || typeof window === "undefined") return;
  installed = true;

  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join("\n\n");
    const list = Array.isArray(buttons) ? buttons.filter(Boolean) : [];

    if (list.length <= 1) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }

    const cancelBtn = list.find((b) => b.style === "cancel");
    const actionBtn = list.find((b) => b.style !== "cancel") || list[list.length - 1];
    const others = list.filter((b) => b !== cancelBtn && b !== actionBtn);
    // With 3+ choices the browser can only ask yes/no, so name the action OK will take.
    const prompt = others.length ? `${text}\n\nOK = ${actionBtn.text}` : text;

    if (window.confirm(prompt)) actionBtn?.onPress?.();
    else cancelBtn?.onPress?.();
  };
}

export default installWebAlert;
