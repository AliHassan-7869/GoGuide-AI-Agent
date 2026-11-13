/**
 * Currency Utility for GoGuide AI
 * Real-time conversion rates against USD base & Location detection
 */

export const CURRENCY_RATES = {
  USD: { rate: 1.0, symbol: "$", code: "USD", name: "US Dollar" },
  EUR: { rate: 0.92, symbol: "€", code: "EUR", name: "Euro" },
  PKR: { rate: 278.0, symbol: "Rs ", code: "PKR", name: "Pakistani Rupee" },
  AED: { rate: 3.67, symbol: "AED ", code: "AED", name: "UAE Dirham" },
  SAR: { rate: 3.75, symbol: "SAR ", code: "SAR", name: "Saudi Riyal" },
  GBP: { rate: 0.79, symbol: "£", code: "GBP", name: "British Pound" },
  TRY: { rate: 36.5, symbol: "₺", code: "TRY", name: "Turkish Lira" },
  JPY: { rate: 153.0, symbol: "¥", code: "JPY", name: "Japanese Yen" },
  THB: { rate: 35.5, symbol: "฿", code: "THB", name: "Thai Baht" },
  IDR: { rate: 16200.0, symbol: "Rp ", code: "IDR", name: "Indonesian Rupiah" },
  INR: { rate: 83.5, symbol: "₹", code: "INR", name: "Indian Rupee" },
  CAD: { rate: 1.36, symbol: "CA$ ", code: "CAD", name: "Canadian Dollar" },
  AUD: { rate: 1.55, symbol: "A$ ", code: "AUD", name: "Australian Dollar" },
  CHF: { rate: 0.90, symbol: "CHF ", code: "CHF", name: "Swiss Franc" },
  QAR: { rate: 3.64, symbol: "QAR ", code: "QAR", name: "Qatari Riyal" },
  KWD: { rate: 0.31, symbol: "KWD ", code: "KWD", name: "Kuwaiti Dinar" },
  OMR: { rate: 0.38, symbol: "OMR ", code: "OMR", name: "Omani Rial" },
  BHD: { rate: 0.38, symbol: "BHD ", code: "BHD", name: "Bahraini Dinar" },
  MYR: { rate: 4.45, symbol: "RM ", code: "MYR", name: "Malaysian Ringgit" },
  SGD: { rate: 1.34, symbol: "S$ ", code: "SGD", name: "Singapore Dollar" },
  CNY: { rate: 7.24, symbol: "¥", code: "CNY", name: "Chinese Yuan" },
};

/**
 * Detects appropriate ISO 4217 Currency Code from city/country string
 */
export function detectCurrencyFromLocation(locStr = "") {
  if (!locStr || typeof locStr !== "string") return "USD";
  const s = locStr.toLowerCase();

  // UAE / Dubai / Abu Dhabi
  if (
    s.includes("dubai") ||
    s.includes("united arab emirates") ||
    s.includes("emirates") ||
    s.includes("abu dhabi") ||
    s.includes("sharjah") ||
    s.includes("ajman") ||
    s.includes("ras al khaimah") ||
    s.includes("fujairah") ||
    s.includes("uae")
  ) {
    return "AED";
  }

  // Pakistan
  if (
    s.includes("pakistan") ||
    s.includes("lahore") ||
    s.includes("karachi") ||
    s.includes("islamabad") ||
    s.includes("rawalpindi") ||
    s.includes("peshawar") ||
    s.includes("multan") ||
    s.includes("faisalabad") ||
    s.includes("sialkot") ||
    s.includes("gujranwala") ||
    s.includes("bahawalpur") ||
    s.includes("sargodha") ||
    s.includes("abbottabad") ||
    s.includes("murree") ||
    s.includes("swat") ||
    s.includes("naran") ||
    s.includes("kaghan") ||
    s.includes("quetta") ||
    s.includes("skardu") ||
    s.includes("hunza") ||
    s.includes("gilgit") ||
    s.includes("punjab") ||
    s.includes("sindh") ||
    s.includes("kpk") ||
    s.includes("balochistan")
  ) {
    return "PKR";
  }

  // Saudi Arabia
  if (
    s.includes("saudi") ||
    s.includes("makkah") ||
    s.includes("mecca") ||
    s.includes("madinah") ||
    s.includes("medina") ||
    s.includes("riyadh") ||
    s.includes("jeddah") ||
    s.includes("dammam")
  ) {
    return "SAR";
  }

  // United Kingdom
  if (
    s.includes("united kingdom") ||
    s.includes("uk") ||
    s.includes("london") ||
    s.includes("england") ||
    s.includes("scotland") ||
    s.includes("manchester") ||
    s.includes("birmingham") ||
    s.includes("edinburgh")
  ) {
    return "GBP";
  }

  // Turkey
  if (
    s.includes("turkey") ||
    s.includes("türkiye") ||
    s.includes("istanbul") ||
    s.includes("antalya") ||
    s.includes("cappadocia") ||
    s.includes("ankara") ||
    s.includes("izmir")
  ) {
    return "TRY";
  }

  // Japan
  if (
    s.includes("japan") ||
    s.includes("tokyo") ||
    s.includes("kyoto") ||
    s.includes("osaka") ||
    s.includes("hiroshima")
  ) {
    return "JPY";
  }

  // Thailand
  if (
    s.includes("thailand") ||
    s.includes("bangkok") ||
    s.includes("phuket") ||
    s.includes("pattaya") ||
    s.includes("chiang mai") ||
    s.includes("krabi")
  ) {
    return "THB";
  }

  // Indonesia
  if (
    s.includes("indonesia") ||
    s.includes("bali") ||
    s.includes("jakarta") ||
    s.includes("ubud") ||
    s.includes("lombok")
  ) {
    return "IDR";
  }

  // India
  if (
    s.includes("india") ||
    s.includes("delhi") ||
    s.includes("mumbai") ||
    s.includes("bangalore") ||
    s.includes("goa") ||
    s.includes("jaipur") ||
    s.includes("kashmir")
  ) {
    return "INR";
  }

  // Canada
  if (
    s.includes("canada") ||
    s.includes("toronto") ||
    s.includes("vancouver") ||
    s.includes("montreal") ||
    s.includes("banff")
  ) {
    return "CAD";
  }

  // Australia
  if (
    s.includes("australia") ||
    s.includes("sydney") ||
    s.includes("melbourne") ||
    s.includes("brisbane")
  ) {
    return "AUD";
  }

  // Switzerland
  if (
    s.includes("switzerland") ||
    s.includes("zurich") ||
    s.includes("geneva") ||
    s.includes("interlaken") ||
    s.includes("zermatt")
  ) {
    return "CHF";
  }

  // Qatar
  if (s.includes("qatar") || s.includes("doha")) return "QAR";
  // Kuwait
  if (s.includes("kuwait")) return "KWD";
  // Oman
  if (s.includes("oman") || s.includes("muscat")) return "OMR";
  // Bahrain
  if (s.includes("bahrain") || s.includes("manama")) return "BHD";
  // Malaysia
  if (s.includes("malaysia") || s.includes("kuala lumpur") || s.includes("langkawi")) return "MYR";
  // Singapore
  if (s.includes("singapore")) return "SGD";
  // China
  if (s.includes("china") || s.includes("beijing") || s.includes("shanghai")) return "CNY";

  // Eurozone
  if (
    s.includes("france") ||
    s.includes("paris") ||
    s.includes("italy") ||
    s.includes("rome") ||
    s.includes("milan") ||
    s.includes("venice") ||
    s.includes("florence") ||
    s.includes("germany") ||
    s.includes("berlin") ||
    s.includes("munich") ||
    s.includes("spain") ||
    s.includes("madrid") ||
    s.includes("barcelona") ||
    s.includes("greece") ||
    s.includes("athens") ||
    s.includes("santorini") ||
    s.includes("netherlands") ||
    s.includes("amsterdam") ||
    s.includes("portugal") ||
    s.includes("lisbon") ||
    s.includes("austria") ||
    s.includes("vienna") ||
    s.includes("belgium") ||
    s.includes("brussels")
  ) {
    return "EUR";
  }

  return "USD";
}

/**
 * Detects the user's home/origin currency from their departure location string,
 * falling back to device timezone (e.g. Asia/Karachi -> PKR) if "Current Location" or empty.
 */
export function detectUserHomeCurrency(fromLocStr = "") {
  const s = (fromLocStr || "").trim().toLowerCase();
  if (s && !s.includes("current location") && !s.includes("my location") && !s.includes("origin")) {
    const detected = detectCurrencyFromLocation(fromLocStr);
    if (detected !== "USD" || s.includes("united states") || s.includes("usa") || s.includes("new york") || s.includes("los angeles")) {
      return detected;
    }
  }

  // Fallback to device timezone detection
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const tzLower = tz.toLowerCase();
    if (tzLower.includes("karachi") || tzLower.includes("islamabad") || tzLower.includes("pakistan")) return "PKR";
    if (tzLower.includes("dubai") || tzLower.includes("muscat")) return "AED";
    if (tzLower.includes("riyadh")) return "SAR";
    if (tzLower.includes("london")) return "GBP";
    if (tzLower.includes("istanbul")) return "TRY";
    if (tzLower.includes("tokyo")) return "JPY";
    if (tzLower.includes("bangkok")) return "THB";
    if (tzLower.includes("jakarta")) return "IDR";
    if (tzLower.includes("kolkata") || tzLower.includes("calcutta")) return "INR";
    if (tzLower.includes("toronto") || tzLower.includes("vancouver")) return "CAD";
    if (tzLower.includes("sydney") || tzLower.includes("melbourne")) return "AUD";
    if (tzLower.includes("zurich")) return "CHF";
    if (tzLower.includes("qatar")) return "QAR";
    if (tzLower.includes("kuwait")) return "KWD";
    if (tzLower.includes("kuala_lumpur")) return "MYR";
    if (tzLower.includes("singapore")) return "SGD";
    if (tzLower.includes("shanghai")) return "CNY";
    if (tzLower.startsWith("europe/")) return "EUR";
  } catch {}

  return "PKR";
}

/**
 * Returns symbol for given currency code
 */
export function getCurrencySymbol(code = "USD") {
  const norm = (code || "USD").toUpperCase();
  return CURRENCY_RATES[norm]?.symbol || "$";
}

/**
 * Converts numeric USD amount to target currency
 */
export function convertAmount(amountInUSD, targetCurrency = "USD") {
  if (isNaN(amountInUSD) || amountInUSD === null || amountInUSD === undefined) return 0;
  const norm = (targetCurrency || "USD").toUpperCase();
  const rate = CURRENCY_RATES[norm]?.rate || 1.0;
  return Math.round(Number(amountInUSD) * rate);
}

/**
 * Converts amount from one currency to another
 */
export function convertBetweenCurrencies(amount, fromCode = "USD", toCode = "USD") {
  if (isNaN(amount) || amount === null || amount === undefined) return 0;
  const fromNorm = (fromCode || "USD").toUpperCase();
  const toNorm = (toCode || "USD").toUpperCase();
  if (fromNorm === toNorm) return Math.round(Number(amount));

  const fromRate = CURRENCY_RATES[fromNorm]?.rate || 1.0;
  const toRate = CURRENCY_RATES[toNorm]?.rate || 1.0;

  // Convert to USD base first, then to target
  const inUSD = Number(amount) / fromRate;
  return Math.round(inUSD * toRate);
}

/**
 * Formats a numeric amount in target currency with proper formatting and commas
 */
export function formatCurrencyAmount(amountInTargetCurrency, targetCurrency = "USD") {
  const symbol = getCurrencySymbol(targetCurrency);
  const rounded = Math.round(Number(amountInTargetCurrency) || 0);
  return `${symbol}${rounded.toLocaleString()}`;
}

/**
 * Generates dynamic daily budget ranges in target destination currency AND user's home currency
 * for the select-budget screen (Economical, Moderate, Luxury)
 */
export function getDailyBudgetTiers(destCurrencyCode = "USD", homeCurrencyCode = "PKR") {
  const norm = (destCurrencyCode || "USD").toUpperCase();
  const rate = CURRENCY_RATES[norm]?.rate || 1.0;
  const symbol = CURRENCY_RATES[norm]?.symbol || norm + " ";

  const homeNorm = (homeCurrencyCode || "PKR").toUpperCase();
  const homeRate = CURRENCY_RATES[homeNorm]?.rate || 1.0;
  const homeSymbol = CURRENCY_RATES[homeNorm]?.symbol || homeNorm + " ";

  // Base USD ranges: Economical: 50-100, Moderate: 150-280, Luxury: 350+
  const econLow = Math.round(50 * rate);
  const econHigh = Math.round(100 * rate);
  const econHomeLow = Math.round(50 * homeRate);
  const econHomeHigh = Math.round(100 * homeRate);

  const modLow = Math.round(150 * rate);
  const modHigh = Math.round(280 * rate);
  const modHomeLow = Math.round(150 * homeRate);
  const modHomeHigh = Math.round(280 * homeRate);

  const luxLow = Math.round(350 * rate);
  const luxHomeLow = Math.round(350 * homeRate);

  return [
    {
      id: "economical",
      label: "Economical / Budget",
      value: "Economical",
      meter: symbol.trim(),
      badgeColor: "#10B981",
      range: `${symbol}${econLow.toLocaleString()} - ${symbol}${econHigh.toLocaleString()} / day`,
      homeRange: `${homeSymbol}${econHomeLow.toLocaleString()} - ${homeSymbol}${econHomeHigh.toLocaleString()} / day`,
      description: "Smart boutique stays, local metro & authentic street food gems.",
      icon: "🪙",
    },
    {
      id: "moderate",
      label: "Moderate / Standard",
      value: "Moderate",
      meter: `${symbol.trim()} ${symbol.trim()}`,
      badgeColor: "#3B82F6",
      range: `${symbol}${modLow.toLocaleString()} - ${symbol}${modHigh.toLocaleString()} / day`,
      homeRange: `${homeSymbol}${modHomeLow.toLocaleString()} - ${homeSymbol}${modHomeHigh.toLocaleString()} / day`,
      description: "Handpicked 4★ hotels, curated cafe dining & express transit.",
      icon: "💳",
    },
    {
      id: "luxury",
      label: "Luxury / VIP",
      value: "Luxury",
      meter: `${symbol.trim()} ${symbol.trim()} ${symbol.trim()}`,
      badgeColor: "#8B5CF6",
      range: `${symbol}${luxLow.toLocaleString()}+ / day`,
      homeRange: `${homeSymbol}${luxHomeLow.toLocaleString()}+ / day`,
      description: "5★ resorts, private chauffeur & VIP skip-the-line access.",
      icon: "💎",
    },
  ];
}

/**
 * Parses any price string and converts any USD amounts to target currency string.
 */
export function convertPriceString(priceStr, targetCurrency = "USD") {
  if (!priceStr || typeof priceStr !== "string") return priceStr || "";
  const norm = (targetCurrency || "USD").toUpperCase();
  if (norm === "USD") return priceStr;

  const rate = CURRENCY_RATES[norm]?.rate || 1.0;
  const symbol = CURRENCY_RATES[norm]?.symbol || norm + " ";

  // Match numbers preceded by $ or standalone numbers in prices
  return priceStr.replace(/\$\s?(\d+(?:,\d+)*(?:\.\d+)?)/g, (match, numStr) => {
    const cleanNum = parseFloat(numStr.replace(/,/g, ""));
    if (isNaN(cleanNum)) return match;
    const converted = Math.round(cleanNum * rate);
    return `${symbol}${converted.toLocaleString()}`;
  });
}


/**
 * Hotel prices are estimates (curated or AI), never live rates. Show "≈ price" when the text
 * contains a real number, otherwise "See price" (the AI sometimes returns "$XXX" or "N/A").
 */
export function hotelPriceLabel(priceStr, targetCurrency = "USD") {
  if (typeof priceStr !== "string" || !/\d/.test(priceStr)) return "See price";
  const converted = convertPriceString(priceStr, targetCurrency).trim();
  return converted.startsWith("≈") ? converted : `≈ ${converted}`;
}
