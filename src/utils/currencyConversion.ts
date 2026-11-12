/**
 * Money Vault - Currency Conversion & Display Utilities
 *
 * Requirements:
 * 1. Allowed Currencies: USD, EUR, GBP, AED, SGD, CAD, AUD, SAR, KWD.
 * 2. Precision Rules:
 *    - 3 decimals: KWD (Kuwaiti Dinar, 1 KWD = 1,000 fils)
 *    - 0 decimals: JPY (if evaluated)
 *    - 2 decimals: USD, EUR, GBP, AED, SGD, CAD, AUD, SAR
 * 3. Math & Rounding:
 *    - ConvertedValue = InrAmount * Rate
 *    - Half-up rounding on minor units: Math.round((InrAmount * Rate + Number.EPSILON) * factor) / factor
 *    - Never uses Indian lakh/crore formatting for foreign currencies; uses standard international Intl.NumberFormat.
 * 4. Freshness:
 *    - Rate age judged strictly by provider's published date/timestamp.
 *    - Expired and hidden if published date > 5 days old (5 * 24 * 60 * 60 * 1000 ms).
 * 5. Display-Only Invariant:
 *    - Converted values are never written to database, storage, exports, or financial calculations.
 */

export const ALLOWED_FX_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SGD',
  'CAD',
  'AUD',
  'SAR',
  'KWD',
] as const;

export type AllowedFxCurrency = (typeof ALLOWED_FX_CURRENCIES)[number];

export interface CurrencyMetadata {
  code: AllowedFxCurrency;
  name: string;
  symbol: string;
  decimals: number;
}

export const CURRENCY_METADATA: Record<string, CurrencyMetadata> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimals: 2 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$', decimals: 2 },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimals: 2 },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', decimals: 3 },
  // JPY precision invariant support
  JPY: { code: 'JPY' as any, name: 'Japanese Yen', symbol: '¥', decimals: 0 },
};

export const MAX_RATE_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

/**
 * Checks whether a currency code is within the supported allowlist.
 */
export function isAllowedFxCurrency(curr: string): curr is AllowedFxCurrency {
  return (ALLOWED_FX_CURRENCIES as readonly string[]).includes(curr.toUpperCase());
}

/**
 * Returns decimal precision for a currency:
 * - 3 for KWD
 * - 0 for JPY
 * - 2 for USD, EUR, GBP, AED, SGD, CAD, AUD, SAR and all standard currencies
 */
export function getCurrencyDecimals(currency: string): number {
  const meta = CURRENCY_METADATA[currency.toUpperCase()];
  if (meta) return meta.decimals;
  if (currency.toUpperCase() === 'JPY') return 0;
  if (currency.toUpperCase() === 'KWD') return 3;
  return 2;
}

/**
 * Validates that an FX rate is a finite positive number.
 */
export function isValidFxRate(rate: unknown): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
}

/**
 * Validates that a provider URL uses https: and belongs to exchangerate-api.com or frankfurter.dev.
 */
export function isSafeProviderUrl(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'exchangerate-api.com' ||
      host === 'www.exchangerate-api.com' ||
      host === 'frankfurter.dev' ||
      host === 'www.frankfurter.dev'
    );
  } catch {
    return false;
  }
}

/**
 * Converts an INR amount to a secondary currency using half-up rounding on the absolute value,
 * preserving the negative sign when inrAmount < 0.
 * Formats with international locale conventions (NOT Indian lakh/crore commas).
 */
export function convertInrToCurrency(
  inrAmount: number,
  rate: number,
  currency: string
): { formatted: string; value: number } {
  const decimals = getCurrencyDecimals(currency);
  if (typeof inrAmount !== 'number' || !Number.isFinite(inrAmount) || inrAmount === 0 || !isValidFxRate(rate)) {
    const zeroFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(0);
    return { formatted: zeroFormatted, value: 0 };
  }

  const isNegative = inrAmount < 0;
  const absAmount = Math.abs(inrAmount);
  const factor = Math.pow(10, decimals);
  const rawProduct = absAmount * rate;
  const roundedAbs = Math.round((rawProduct + Number.EPSILON) * factor) / factor;
  const signedValue = isNegative && roundedAbs > 0 ? -roundedAbs : roundedAbs;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(signedValue);

  return { formatted, value: signedValue };
}

/**
 * Judges age strictly by the provider's published timestamp.
 * Returns true if the published rate is older than 5 days.
 */
export function isRateExpired(publishedTimestamp: number, now: number = Date.now()): boolean {
  if (!publishedTimestamp || isNaN(publishedTimestamp)) return true;
  return now - publishedTimestamp > MAX_RATE_AGE_MS;
}

/**
 * Formats the provider's published date string or timestamp into a readable date label.
 * Always formats as "DD MMM YYYY" (e.g. "03 Nov 2026").
 */
export function formatRatePublishedDate(dateInput: string | number): string {
  if (!dateInput) return 'Recent';
  try {
    let d: Date;
    if (typeof dateInput === 'number') {
      d = new Date(dateInput);
    } else if (dateInput.includes('-')) {
      const parts = dateInput.split('T')[0].split('-');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(dateInput);
      }
    } else {
      d = new Date(dateInput);
    }

    if (isNaN(d.getTime())) return String(dateInput);

    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()] || '';
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
}
