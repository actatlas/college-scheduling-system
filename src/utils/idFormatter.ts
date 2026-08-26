/**
 * Standardizes any internal system or database ID into the institutional C-24XXXX display format.
 * Examples:
 *   1 -> "C-240001"
 *   "2" -> "C-240002"
 *   "T001" -> "C-240001"
 *   "T101" -> "C-240101"
 *   "C-240005" -> "C-240005"
 *   123 -> "C-240123"
 */
export function formatSystemId(rawId: string | number | null | undefined): string {
  if (rawId === null || rawId === undefined || rawId === "") {
    return "C-240001";
  }

  const str = String(rawId).trim();

  // If already exactly matches C-24XXXX (4 digits)
  if (/^C-24\d{4}$/i.test(str)) {
    return str.toUpperCase();
  }

  // Extract all numeric digits
  let digits = str.replace(/\D/g, "");

  if (!digits) {
    // Generate deterministic hash into 4 digits for text-only identifiers
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const num = (Math.abs(hash) % 9999) + 1;
    return `C-24${String(num).padStart(4, "0")}`;
  }

  // If starts with 24 and has 6 total digits (e.g. 240001), take the last 4 digits
  if (digits.length === 6 && digits.startsWith("24")) {
    return `C-24${digits.slice(2)}`;
  }

  // If more than 4 digits (like timestamps Date.now()), take the last 4 digits
  if (digits.length > 4) {
    digits = digits.slice(-4);
  }

  const numVal = parseInt(digits, 10);
  if (isNaN(numVal) || numVal === 0) {
    return "C-240001";
  }

  const padded = String(numVal).padStart(4, "0");
  return `C-24${padded}`;
}

export const formatUserId = formatSystemId;
export const formatFacultyId = formatSystemId;
export const formatStudentId = formatSystemId;

