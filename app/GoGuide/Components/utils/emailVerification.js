// Email verification for AI features. Pure module (unit-tested).
// The server rejects AI requests from unverified email/password accounts (app.py), and reads
// `email_verified` from the Firebase ID token, which is cached for up to an hour. So after the user
// confirms their address we must reload the user AND force a fresh token.

// Keep in sync with the 403 message in app.py (the app recognises a server rejection by this text).
export const EMAIL_VERIFY_MESSAGE =
  "Please verify your email to use AI features. Check your inbox for the verification link.";

/** True for signed-in email/password accounts whose address is not confirmed yet. Guests are exempt. */
export function needsEmailVerification(user) {
  if (!user || user.isAnonymous || !user.email || user.emailVerified) return false;
  return Array.isArray(user.providerData) && user.providerData.some((p) => p?.providerId === "password");
}

/**
 * Re-reads the account (the user may have just clicked the link) and refreshes the ID token.
 * Resolves true when the account no longer needs verification. Never throws.
 */
export async function refreshEmailVerification(user) {
  if (!needsEmailVerification(user)) return true;
  try {
    await user.reload();
    if (user.emailVerified) {
      await user.getIdToken(true);
      return true;
    }
  } catch {
    // offline or transient: stay "unverified" and let the caller ask the user to retry
  }
  return !needsEmailVerification(user);
}

export const isEmailVerificationError = (err) => /verify your email/i.test(String(err?.message || ""));
