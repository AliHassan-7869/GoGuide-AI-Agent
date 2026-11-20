// "Forgot password?" helpers for the sign-in screen. Pure module (unit-tested).

// Same wording whether or not an account exists, so the form cannot be used to find out
// which emails are registered.
export const RESET_SENT_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password. Check your inbox and spam folder.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateResetEmail(raw) {
  const email = String(raw ?? "").trim();
  if (!email) {
    return { ok: false, message: "Enter your email address above, then tap Forgot password again." };
  }
  if (email.length > 320 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Please enter a valid email address (e.g. name@example.com)." };
  }
  return { ok: true, email };
}

/** Turns the result of sendPasswordResetEmail (null on success, or the thrown error) into what the user sees. */
export function resetOutcome(error) {
  const code = error?.code;
  if (!error || code === "auth/user-not-found") {
    return { sent: true, message: RESET_SENT_MESSAGE };
  }
  switch (code) {
    case "auth/too-many-requests":
      return { sent: false, message: "Too many requests. Please wait a few minutes and try again." };
    case "auth/network-request-failed":
      return { sent: false, message: "Could not connect. Check your internet connection and try again." };
    case "auth/invalid-email":
      return { sent: false, message: "Please enter a valid email address (e.g. name@example.com)." };
    default:
      return { sent: false, message: "We couldn't send the reset email right now. Please try again." };
  }
}
