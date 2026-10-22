/**
 * Currency Utility for GoGuide AI
 * Real-time conversion rates against USD base
 */

export const CURRENCY_RATES = {
  USD: { rate: 1.0, symbol: "$", code: "USD", name: "US Dollar" },
  EUR: { rate: 0.92, symbol: "€", code: "EUR", name: "Euro" },
  PKR: { rate: 278.0, symbol: "Rs ", code: "PKR", name: "Pakistani Rupee" },
  AED: { rate: 3.67, symbol: "AED ", code: "AED", name: "UAE Dirham" },
  GBP: { rate: 0.79, symbol: "£", code: "GBP", name: "British Pound" },
  SAR: { rate: 3.75, symbol: "SAR ", code: "SAR", name: "Saudi Riyal" },
  CAD: { rate: 1.36, symbol: "CA$ ", code: "CAD", name: "Canadian Dollar" },
  INR: { rate: 83.5, symbol: "₹", code: "INR", name: "Indian Rupee" },
};

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
 * Formats a numeric amount in target currency with proper formatting and commas
 */
export function formatCurrencyAmount(amountInTargetCurrency, targetCurrency = "USD") {
  const symbol = getCurrencySymbol(targetCurrency);
  const rounded = Math.round(Number(amountInTargetCurrency) || 0);
  return `${symbol}${rounded.toLocaleString()}`;
}

/**
 * Parses any price string (e.g. "$120 per night", "$45", "Free", "$20 - $35")
 * and converts any USD amounts to target currency string.
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
