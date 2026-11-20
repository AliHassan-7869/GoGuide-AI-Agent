// Older versions saved the entire Firebase sign-in result (including refresh tokens) to device storage
// under this key. Nothing ever read it, so it is only a risk. Firebase Auth keeps its own session.
export const LEGACY_LOGIN_KEY = "loginUserData";

/** Deletes the leftover credential. Never throws: cleanup must not block sign-in or app start. */
export async function purgeLegacyLoginData(storage) {
  try {
    await storage?.removeItem?.(LEGACY_LOGIN_KEY);
  } catch {
    // best effort
  }
}
