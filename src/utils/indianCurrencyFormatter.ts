/**
 * Indian Currency & Number Formatting Utility
 * Formats monetary amounts in INR (₹) using Indian numbering system (Lakhs & Crores).
 */

/**
 * Format raw currency value into Indian notation (₹)
 * Examples:
 * - formatINR(3842.50, { isPrice: true }) => "₹3,842.50"
 * - formatINR(13900000000000) => "₹13.9 lakh crore"
 * - formatINR(460990000000) => "₹46,099 crore"
 * - formatINR(125000) => "₹1,25,000"
 */
export function formatINR(
  val: number | undefined | null,
  options?: {
    isPrice?: boolean;
    compact?: boolean;
    decimals?: number;
    showSign?: boolean;
  }
): string {
  if (val === undefined || val === null || isNaN(val)) return '—';

  const sign = val < 0 ? '-' : options?.showSign && val > 0 ? '+' : '';
  const absVal = Math.abs(val);

  // For share prices, always show exact rupee value with 2 decimals
  if (options?.isPrice) {
    return `${sign}₹${absVal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // 1 Lakh Crore = 10^12 = 1 Trillion INR
  if (absVal >= 1e12) {
    const lakhCr = absVal / 1e12;
    const formatted = lakhCr >= 10 ? lakhCr.toFixed(1) : lakhCr.toFixed(2);
    return `${sign}₹${formatted}${options?.compact ? 'L Cr' : ' lakh crore'}`;
  }

  // 1 Crore = 10^7 = 10 Million INR
  if (absVal >= 1e7) {
    const cr = absVal / 1e7;
    const formatted = cr >= 1000 ? Math.round(cr).toLocaleString('en-IN') : cr.toFixed(1);
    return `${sign}₹${formatted}${options?.compact ? ' Cr' : ' crore'}`;
  }

  // 1 Lakh = 10^5 = 100 Thousand INR
  if (absVal >= 1e5) {
    const lakh = absVal / 1e5;
    return `${sign}₹${lakh.toFixed(1)}${options?.compact ? ' L' : ' lakh'}`;
  }

  // Below 1 Lakh
  const decimals = options?.decimals ?? (Number.isInteger(absVal) ? 0 : 2);
  return `${sign}₹${absVal.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format values that are already expressed in ₹ Crores (common in Indian financial statements)
 */
export function formatCrores(
  croresVal: number | undefined | null,
  options?: { compact?: boolean; decimals?: number }
): string {
  if (croresVal === undefined || croresVal === null || isNaN(croresVal)) return '—';

  const sign = croresVal < 0 ? '-' : '';
  const abs = Math.abs(croresVal);

  if (abs >= 100000) {
    const lakhCr = abs / 100000;
    return `${sign}₹${lakhCr.toFixed(2)}${options?.compact ? 'L Cr' : ' lakh crore'}`;
  }

  const dec = options?.decimals ?? (abs < 100 ? 1 : 0);
  return `${sign}₹${abs.toLocaleString('en-IN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })}${options?.compact ? ' Cr' : ' crore'}`;
}

/**
 * Format raw numbers (shares, volume) in Indian numbering (lakhs & crores)
 */
export function formatIndianCount(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  const abs = Math.abs(val);

  if (abs >= 1e7) {
    return `${(val / 1e7).toFixed(2)} Cr`;
  }
  if (abs >= 1e5) {
    return `${(val / 1e5).toFixed(2)} L`;
  }
  return val.toLocaleString('en-IN');
}
