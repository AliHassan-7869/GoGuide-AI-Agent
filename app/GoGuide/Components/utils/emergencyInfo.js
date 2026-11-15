// Personal emergency contacts and medical info. Kept ONLY on the device (AsyncStorage), never uploaded.
// Pure module (unit-tested): cleaning, validation and the phone link.

export const STORAGE_KEY = "@goguide_emergency_info";
export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const MAX_CONTACTS = 3;

const clip = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const clipMultiline = (v, n) => String(v ?? "").replace(/\r/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);

export const emptyContact = () => ({ name: "", phone: "", relation: "" });

export function emptyEmergencyInfo() {
  return {
    contacts: Array.from({ length: MAX_CONTACTS }, emptyContact),
    bloodType: "",
    allergies: "",
    medications: "",
    insurance: "",
    notes: "",
  };
}

/** Keeps an optional leading + and digits, spaces, brackets and dashes; at most 25 characters. */
export function cleanPhone(value) {
  const t = String(value ?? "").trim();
  const plus = t.startsWith("+") ? "+" : "";
  return (plus + t.replace(/[^\d\s()\-]/g, "")).slice(0, 25).trim();
}

export const phoneDigits = (value) => String(value ?? "").replace(/\D/g, "");
export const isValidPhone = (value) => phoneDigits(value).length >= 5 && phoneDigits(value).length <= 15;
/** tel: link for the Call button, or "" when the number is not usable. */
export const telLink = (value) => (isValidPhone(value) ? `tel:${String(value).trim().startsWith("+") ? "+" : ""}${phoneDigits(value)}` : "");

export function sanitizeEmergencyInfo(raw) {
  const base = emptyEmergencyInfo();
  if (!raw || typeof raw !== "object") return base;
  const contacts = Array.isArray(raw.contacts) ? raw.contacts : [];
  base.contacts = Array.from({ length: MAX_CONTACTS }, (_, i) => {
    const c = contacts[i] && typeof contacts[i] === "object" ? contacts[i] : {};
    return { name: clip(c.name, 60), phone: cleanPhone(c.phone), relation: clip(c.relation, 40) };
  });
  base.bloodType = BLOOD_TYPES.includes(raw.bloodType) ? raw.bloodType : "";
  base.allergies = clipMultiline(raw.allergies, 300);
  base.medications = clipMultiline(raw.medications, 300);
  base.insurance = clip(raw.insurance, 120);
  base.notes = clipMultiline(raw.notes, 400);
  return base;
}

/** Returns a list of plain-language problems (empty list = fine to save). */
export function validateEmergencyInfo(info) {
  const problems = [];
  (info?.contacts || []).forEach((c, i) => {
    if (c.phone && !isValidPhone(c.phone)) problems.push(`Contact ${i + 1}: the phone number does not look right`);
    if (c.phone && !c.name) problems.push(`Contact ${i + 1}: add a name for this number`);
  });
  return problems;
}

export function isEmergencyInfoEmpty(info) {
  const i = sanitizeEmergencyInfo(info);
  return !i.bloodType && !i.allergies && !i.medications && !i.insurance && !i.notes && i.contacts.every((c) => !c.name && !c.phone);
}
