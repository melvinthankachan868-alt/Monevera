/**
 * Money Vault — Group Invitation Validation Utilities
 * Strict validation and normalization for email addresses and phone numbers.
 */

export interface ValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Strict Email Validator
 * Rejects:
 * - empty string / whitespace
 * - missing @ or missing domain
 * - abc, abc@, abc@x, abc@x., etc.
 * - spaces within the email
 */
export function validateEmail(email: unknown): ValidationResult {
  if (typeof email !== 'string') {
    return { isValid: false, normalized: '', error: 'Email must be a valid text string.' };
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, normalized: '', error: 'Email address cannot be empty.' };
  }

  if (/\s/.test(trimmed)) {
    return { isValid: false, normalized: '', error: 'Email address cannot contain spaces.' };
  }

  // RFC-compliant regex requiring a valid domain with at least 2 alpha characters in TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      normalized: trimmed,
      error: 'Please enter a valid email address (e.g., name@domain.com).',
    };
  }

  // Disallow trailing/leading dots in local part
  const [localPart, domainPart] = trimmed.split('@');
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false, normalized: trimmed, error: 'Invalid email local format.' };
  }

  if (!domainPart || domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.includes('..')) {
    return { isValid: false, normalized: trimmed, error: 'Invalid email domain format.' };
  }

  return { isValid: true, normalized: trimmed.toLowerCase() };
}

/**
 * Strict Phone Number Validator & Normalizer
 * Primary support: Indian phone numbers (+91 or 10 digits starting with 6, 7, 8, or 9)
 * Also supports international E.164 formats (+[country code][number]).
 *
 * Rejects:
 * - empty string
 * - letters or invalid characters
 * - "123", "+91", incomplete digits
 */
export function validatePhone(phone: unknown): ValidationResult {
  if (typeof phone !== 'string') {
    return { isValid: false, normalized: '', error: 'Phone number must be a valid text string.' };
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, normalized: '', error: 'Phone number cannot be empty.' };
  }

  // Remove spaces, hyphens, and parentheses
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, '');

  // Must only contain digits and optional leading plus
  if (!/^\+?[0-9]+$/.test(cleaned)) {
    return { isValid: false, normalized: cleaned, error: 'Phone number must contain only numbers.' };
  }

  // If starts with +91, it MUST be followed by exactly 10 digits starting with 6, 7, 8, or 9
  if (cleaned.startsWith('+91')) {
    if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
      return { isValid: true, normalized: cleaned };
    }
    return {
      isValid: false,
      normalized: cleaned,
      error: 'Indian mobile numbers with +91 must have 10 digits starting with 6, 7, 8, or 9.',
    };
  }

  // Check if it's an Indian phone number without country code: 10 digits starting with 6, 7, 8, 9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true, normalized: `+91${cleaned}` };
  }

  // Format 3: 0 followed by 10 digits starting with 6, 7, 8, 9
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: true, normalized: `+91${cleaned.substring(1)}` };
  }

  // Format 4: International E.164: + followed by 1 to 3 digit country code (non-91) and subscriber number (8 to 14 digits)
  if (/^\+(?!91)[1-9]\d{7,14}$/.test(cleaned)) {
    return { isValid: true, normalized: cleaned };
  }

  return {
    isValid: false,
    normalized: cleaned,
    error: 'Please enter a valid 10-digit mobile number or full international format with country code (e.g., +91 98765 43210).',
  };
}
