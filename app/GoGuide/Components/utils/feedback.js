// "Rate & Feedback": builds the support ticket text. Pure module (unit-tested).
export const MAX_COMMENT = 1500;

export const clampStars = (n) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(5, Math.max(0, v)) : 0;
};

export const starLabel = (n) => ["Tap a star", "Poor", "Could be better", "Okay", "Good", "Loved it"][clampStars(n)];

/** Message stored in the SupportTickets collection (rules: non-empty, at most 2000 characters). */
export function buildFeedbackMessage(stars, comment) {
  const s = clampStars(stars);
  const text = String(comment ?? "").replace(/\r/g, "").trim().slice(0, MAX_COMMENT);
  return text ? `Rating: ${s}/5\n${text}` : `Rating: ${s}/5`;
}

export const canSubmitFeedback = (stars) => clampStars(stars) >= 1;
