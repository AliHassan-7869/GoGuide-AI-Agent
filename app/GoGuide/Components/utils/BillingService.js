import { Platform } from "react-native";

// Product identifiers configured in Google Play Console + RevenueCat Offerings
export const PRODUCT_IDS = {
  PRO_MONTHLY: "goguide_pro_monthly",
  PRO_YEARLY: "goguide_pro_yearly",
  TRIP_PACK_10: "goguide_trip_pack_10",
};

// Fallback display plans when running on web or before RevenueCat offerings load
export const FALLBACK_PLANS = [
  {
    id: PRODUCT_IDS.PRO_YEARLY,
    title: "Pro Annual",
    subtitle: "Best value — save 17% vs monthly",
    priceString: "$99.99 / year",
    badge: "BEST VALUE",
    type: "subscription",
    rcPackage: null,
  },
  {
    id: PRODUCT_IDS.PRO_MONTHLY,
    title: "Pro Monthly",
    subtitle: "Unlimited trips & any duration — cancel anytime",
    priceString: "$9.99 / month",
    badge: null,
    type: "subscription",
    rcPackage: null,
  },
  {
    id: PRODUCT_IDS.TRIP_PACK_10,
    title: "10-Trip Pack",
    subtitle: "Perfect for one-time travelers — never expires",
    priceString: "$4.99",
    badge: "ONE-TIME",
    type: "pack",
    rcPackage: null,
  },
];

let configured = false;
let purchasesModule = null;

function getPurchases() {
  if (Platform.OS === "web") return null;
  if (purchasesModule !== null) return purchasesModule;
  try {
    const mod = require("react-native-purchases");
    purchasesModule = mod?.default || mod || null;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

/** Configure RevenueCat once on native startup. Safe no-op on web or when key is unset. */
export function initBilling() {
  if (configured || Platform.OS === "web") return false;
  const apiKey =
    Platform.OS === "ios"
      ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "").trim()
      : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "").trim();
  if (!apiKey) return false;
  const Purchases = getPurchases();
  if (!Purchases || typeof Purchases.configure !== "function") return false;
  try {
    Purchases.configure({ apiKey });
    configured = true;
    return true;
  } catch (e) {
    console.warn("[Billing] configure notice:", e?.message);
    return false;
  }
}

/** Bind the RevenueCat app_user_id to the verified Firebase UID. */
export async function identifyBillingUser(firebaseUid) {
  if (!firebaseUid || Platform.OS === "web") return;
  if (!configured) initBilling();
  if (!configured) return;
  const Purchases = getPurchases();
  try {
    await Purchases?.logIn?.(String(firebaseUid));
  } catch (e) {
    console.warn("[Billing] logIn notice:", e?.message);
  }
}

export async function clearBillingUser() {
  if (!configured || Platform.OS === "web") return;
  const Purchases = getPurchases();
  try {
    await Purchases?.logOut?.();
  } catch {}
}

/** Fetch live offerings & localized prices from RevenueCat (falls back gracefully on web/dev). */
export async function getAvailablePlans() {
  if (Platform.OS === "web") return FALLBACK_PLANS;
  if (!configured) initBilling();
  if (!configured) return FALLBACK_PLANS;
  const Purchases = getPurchases();
  try {
    const offerings = await Purchases?.getOfferings?.();
    const packages = offerings?.current?.availablePackages || [];
    if (!packages.length) return FALLBACK_PLANS;

    return FALLBACK_PLANS.map((fallback) => {
      const match = packages.find(
        (pkg) =>
          pkg?.product?.identifier === fallback.id ||
          (fallback.id === PRODUCT_IDS.PRO_YEARLY && pkg?.packageType === "ANNUAL") ||
          (fallback.id === PRODUCT_IDS.PRO_MONTHLY && pkg?.packageType === "MONTHLY")
      );
      if (!match) return fallback;
      return {
        ...fallback,
        priceString: match.product?.priceString || fallback.priceString,
        rcPackage: match,
      };
    });
  } catch (e) {
    console.warn("[Billing] getOfferings notice:", e?.message);
    return FALLBACK_PLANS;
  }
}

/**
 * Trigger a Google Play / App Store purchase through RevenueCat.
 * Never unlocks Pro locally: callers MUST re-fetch GET /api/users/entitlements after purchase.
 */
export async function purchasePlan(plan) {
  if (Platform.OS === "web") {
    return { ok: false, error: "In-app subscriptions are available in the GoGuide Android app." };
  }
  if (!configured) initBilling();
  if (!configured) {
    return { ok: false, error: "Billing is not configured in this build yet." };
  }
  const Purchases = getPurchases();
  if (!Purchases) return { ok: false, error: "Purchases SDK unavailable." };
  try {
    if (plan?.rcPackage && typeof Purchases.purchasePackage === "function") {
      await Purchases.purchasePackage(plan.rcPackage);
      return { ok: true };
    }
    if (plan?.id && typeof Purchases.purchaseProduct === "function") {
      await Purchases.purchaseProduct(plan.id);
      return { ok: true };
    }
    return { ok: false, error: "This plan is not available in the store yet." };
  } catch (e) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: e?.message || "Purchase could not be completed." };
  }
}

/** Required by Google Play: restore previous subscriptions and trigger backend entitlement refresh. */
export async function restoreBillingPurchases() {
  if (Platform.OS === "web") {
    return { ok: false, error: "Restore is available on the GoGuide Android app." };
  }
  if (!configured) initBilling();
  if (!configured) {
    return { ok: false, error: "Billing is not configured in this build yet." };
  }
  const Purchases = getPurchases();
  try {
    await Purchases?.restorePurchases?.();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Could not restore purchases." };
  }
}

