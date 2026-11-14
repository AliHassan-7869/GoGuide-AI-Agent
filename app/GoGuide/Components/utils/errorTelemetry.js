import { Platform } from "react-native";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../Configs/FirebaseConfig";
import { createErrorReporter, installGlobalErrorHandlers } from "./errorReporting";

let reporter = null;

/** The shared reporter (also usable from catch blocks): reportError(error, { componentStack }). */
export function reportError(error, extra) {
  if (!reporter) {
    reporter = createErrorReporter({
      platform: Platform.OS,
      send: (payload) => addDoc(collection(db, "AppErrors"), payload),
    });
  }
  return reporter(error, extra);
}

let installed = false;
/** Call once at app start. Safe to call again. */
export function installErrorTelemetry() {
  if (installed) return;
  installed = true;
  installGlobalErrorHandlers((error) => reportError(error));
}
