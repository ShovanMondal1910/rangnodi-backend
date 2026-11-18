import crypto from 'crypto';

/**
 * Generates a cryptographically secure 10-digit numeric ID string.
 * Ensures the first digit is non-zero (1-9) so it is strictly 10 digits.
 */
export const generate10DigitId = (): string => {
  // First digit between 1 and 9
  const firstDigit = crypto.randomInt(1, 10).toString();
  // Next 9 digits between 0 and 9
  const remainingDigits = Array.from({ length: 9 }, () => crypto.randomInt(0, 10)).join('');
  return `${firstDigit}${remainingDigits}`;
};
