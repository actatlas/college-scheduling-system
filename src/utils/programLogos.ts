import itLogo from "../assets/images/programs/Information Technology Program logo.jpg";
import baLogo from "../assets/images/programs/Business Administration logo.jpg";
import crimLogo from "../assets/images/programs/Criminal Justice Education Program logo.jpg";
import hmLogo from "../assets/images/programs/Hospitality Management Program logo.jpg";
import teLogo from "../assets/images/programs/Teacher Education Program logo.jpg";
import defaultLogo from "../assets/images/Logo.png";

export { itLogo, baLogo, crimLogo, hmLogo, teLogo, defaultLogo };

export const PROGRAM_LOGOS: Record<string, string> = {
  // Information Technology Program
  ITP: itLogo,
  BSIT: itLogo,
  BSCS: itLogo,
  "Information Technology": itLogo,
  "Information Technology Program": itLogo,

  // Business Administration / Accountancy
  BSA: baLogo,
  BSBA: baLogo,
  "Business Administration": baLogo,
  "Business Administration Program": baLogo,
  Accountancy: baLogo,

  // Criminal Justice Education
  CJEP: crimLogo,
  BSCRIM: crimLogo,
  "Criminal Justice": crimLogo,
  "Criminal Justice Education Program": crimLogo,
  Criminology: crimLogo,

  // Hospitality Management
  HMP: hmLogo,
  BSHM: hmLogo,
  "Hospitality Management": hmLogo,
  "Hospitality Management Program": hmLogo,
  HM: hmLogo,

  // Teacher Education
  TEP: teLogo,
  BSED: teLogo,
  BEED: teLogo,
  "Teacher Education": teLogo,
  "Teacher Education Program": teLogo,
  Education: teLogo,
};

export function getProgramLogo(identifier?: string | string[] | null): string {
  if (!identifier) return defaultLogo;
  const raw = Array.isArray(identifier) ? String(identifier[0] || "").trim() : String(identifier).trim();
  if (!raw) return defaultLogo;
  if (PROGRAM_LOGOS[raw]) return PROGRAM_LOGOS[raw];

  const upper = raw.toUpperCase();
  if (PROGRAM_LOGOS[upper]) return PROGRAM_LOGOS[upper];

  if (upper.includes("IT") || upper.includes("TECH") || upper.includes("COMPUTER") || upper.includes("CS")) {
    return itLogo;
  }
  if (upper.includes("CRIM") || upper.includes("JUSTICE") || upper.includes("CJEP")) {
    return crimLogo;
  }
  if (upper.includes("BUS") || upper.includes("ADMIN") || upper.includes("BSA") || upper.includes("ACCOUNT")) {
    return baLogo;
  }
  if (upper.includes("HOSP") || upper.includes("HOTEL") || upper.includes("HMP") || upper.includes("HM")) {
    return hmLogo;
  }
  if (upper.includes("TEACH") || upper.includes("EDUC") || upper.includes("TEP") || upper.includes("BSED") || upper.includes("BEED")) {
    return teLogo;
  }

  return defaultLogo;
}
