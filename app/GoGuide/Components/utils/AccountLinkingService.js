import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  reload,
  sendEmailVerification,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../Configs/FirebaseConfig";
import { syncUserEntitlements } from "../../Configs/AiModel";
import { identifyBillingUser } from "./BillingService";

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "10minutemail.net",
  "yopmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "fakeinbox.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "mintemail.com",
]);

function isDisposableEmail(email) {
  const domain = String(email || "").trim().toLowerCase().split("@")[1] || "";
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Start a Guest session via Firebase Anonymous Auth (`signInAnonymously`),
 * bind the Firebase UID to RevenueCat, and sync entitlements (`POST /api/users/sync`)
 * so the backend provisions `free_trips_limit = 2`.
 */
export async function continueAsGuest() {
  let user = auth.currentUser;
  if (!user) {
    const res = await signInAnonymously(auth);
    user = res.user;
  }
  await identifyBillingUser(user?.uid).catch(() => {});
  const entitlements = await syncUserEntitlements().catch(() => null);
  return { user, entitlements };
}

/**
 * Link an anonymous guest account to Email/Password (preserving the same Firebase UID
 * so the backend upgrades `free_trips_limit` 2 -> 10 while keeping `trips_used`).
 * Handles `auth/credential-already-in-use` gracefully by signing into the existing account.
 */
export async function linkAnonymousWithEmail({ email, password, fullName }) {
  const cleanEmail = String(email || "").trim();
  const cleanPass = String(password || "");
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  if (isDisposableEmail(cleanEmail)) {
    throw new Error("Please use a real email address (temporary/disposable email domains are not supported).");
  }
  if (cleanPass.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const current = auth.currentUser;
  const credential = EmailAuthProvider.credential(cleanEmail, cleanPass);

  let user = current;
  try {
    if (current && current.isAnonymous) {
      const res = await linkWithCredential(current, credential);
      user = res.user;
      if (fullName?.trim()) {
        await updateProfile(user, { displayName: fullName.trim() }).catch(() => {});
      }
    } else {
      const res = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      user = res.user;
    }
  } catch (err) {
    if (err?.code === "auth/credential-already-in-use" || err?.code === "auth/email-already-in-use") {
      // Account already exists: sign in cleanly so the user doesn't get stuck
      const res = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      user = res.user;
    } else {
      throw err;
    }
  }

  // Send verification email for newly linked email/password accounts so fake emails cannot claim +8 free trips
  let verificationSent = false;
  if (user && !user.emailVerified && typeof sendEmailVerification === "function") {
    try {
      await sendEmailVerification(user);
      verificationSent = true;
    } catch {}
  }

  // Force a fresh ID token so the backend sees the updated provider & email_verified status
  if (user?.getIdToken) {
    await user.getIdToken(true).catch(() => {});
  }
  await identifyBillingUser(user?.uid);
  const entitlements = await syncUserEntitlements().catch(() => null);
  return {
    user,
    entitlements,
    needsEmailVerification: Boolean(user && !user.emailVerified),
    verificationSent,
  };
}

/**
 * Reloads the current Firebase user after they click the inbox verification link,
 * refreshes their ID token, and re-syncs backend entitlements (unlocking 2 -> 10 free trips).
 */
export async function refreshEmailVerificationAndSync() {
  const user = auth.currentUser;
  if (!user) throw new Error("No active session found.");
  if (typeof reload === "function") {
    await reload(user);
  }
  if (user.getIdToken) {
    await user.getIdToken(true).catch(() => {});
  }
  const entitlements = await syncUserEntitlements().catch(() => null);
  return { verified: Boolean(user.emailVerified), entitlements };
}

export async function resendAccountVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error("No active session found.");
  if (typeof sendEmailVerification === "function") {
    await sendEmailVerification(user);
  }
}

/**
 * Link an anonymous guest account to a Google ID token via `linkWithCredential`.
 * Gracefully falls back to `signInWithCredential` if the Google account already exists.
 */
export async function linkAnonymousWithGoogleIdToken(idToken) {
  if (!idToken) throw new Error("Missing Google ID token.");
  const credential = GoogleAuthProvider.credential(idToken);
  const current = auth.currentUser;

  let user = current;
  try {
    if (current && current.isAnonymous) {
      const res = await linkWithCredential(current, credential);
      user = res.user;
    } else {
      const res = await signInWithCredential(auth, credential);
      user = res.user;
    }
  } catch (err) {
    if (err?.code === "auth/credential-already-in-use") {
      const res = await signInWithCredential(auth, credential);
      user = res.user;
    } else {
      throw err;
    }
  }

  if (user?.getIdToken) {
    await user.getIdToken(true).catch(() => {});
  }
  await identifyBillingUser(user?.uid);
  const entitlements = await syncUserEntitlements().catch(() => null);
  return { user, entitlements };
}

