export type ProgramCode = "ITP" | "BAP" | "CJEP" | "TEP" | "HMP" | "OTHER";

export interface ProgramTheme {
  code: ProgramCode;
  name: string;
  colorName: string;
  primary: string; // main accent / border / badge background
  border: string;
  badgeBg: string;
  badgeText: string;
  lightBg: string;
  lightText: string;
  lightBorder: string;
  darkBg: string;
  darkText: string;
  darkBorder: string;
}

export const PROGRAM_THEMES: Record<ProgramCode, ProgramTheme> = {
  ITP: {
    code: "ITP",
    name: "Information Technology Program",
    colorName: "Maroon",
    primary: "#800000",
    border: "#800000",
    badgeBg: "#800000",
    badgeText: "#ffffff",
    lightBg: "#fff1f2",
    lightText: "#881337",
    lightBorder: "#fda4af",
    darkBg: "rgba(128, 0, 0, 0.22)",
    darkText: "#fecdd3",
    darkBorder: "#9f1239",
  },
  BAP: {
    code: "BAP",
    name: "Business Administration Program",
    colorName: "Yellow",
    primary: "#d97706", // warm amber/yellow with high readability
    border: "#d97706",
    badgeBg: "#eab308",
    badgeText: "#451a03",
    lightBg: "#fefce8",
    lightText: "#854d0e",
    lightBorder: "#fde047",
    darkBg: "rgba(217, 119, 6, 0.22)",
    darkText: "#fef08a",
    darkBorder: "#ca8a04",
  },
  CJEP: {
    code: "CJEP",
    name: "Criminal Justice Education Program",
    colorName: "Dark Blue",
    primary: "#172554", // deep dark navy / midnight blue
    border: "#172554",
    badgeBg: "#172554",
    badgeText: "#ffffff",
    lightBg: "#eff6ff",
    lightText: "#172554",
    lightBorder: "#93c5fd",
    darkBg: "rgba(23, 37, 84, 0.35)",
    darkText: "#bfdbfe",
    darkBorder: "#1e40af",
  },
  TEP: {
    code: "TEP",
    name: "Teacher Education Program",
    colorName: "Blue",
    primary: "#2563eb", // royal / true blue
    border: "#2563eb",
    badgeBg: "#2563eb",
    badgeText: "#ffffff",
    lightBg: "#eff6ff",
    lightText: "#1d4ed8",
    lightBorder: "#60a5fa",
    darkBg: "rgba(37, 99, 235, 0.22)",
    darkText: "#93c5fd",
    darkBorder: "#3b82f6",
  },
  HMP: {
    code: "HMP",
    name: "Hospitality Management Program",
    colorName: "Green",
    primary: "#15803d", // forest / emerald green
    border: "#15803d",
    badgeBg: "#15803d",
    badgeText: "#ffffff",
    lightBg: "#f0fdf4",
    lightText: "#166534",
    lightBorder: "#86efac",
    darkBg: "rgba(21, 128, 61, 0.22)",
    darkText: "#bbf7d0",
    darkBorder: "#22c55e",
  },
  OTHER: {
    code: "OTHER",
    name: "General Education / Core",
    colorName: "Slate",
    primary: "#64748b",
    border: "#64748b",
    badgeBg: "#64748b",
    badgeText: "#ffffff",
    lightBg: "#f8fafc",
    lightText: "#334155",
    lightBorder: "#cbd5e1",
    darkBg: "rgba(100, 116, 139, 0.22)",
    darkText: "#e2e8f0",
    darkBorder: "#475569",
  },
};

const IT_KEYWORDS = ["ITP", "BSIT", "BSCS", "INFORMATION TECHNOLOGY", "COMPUTER SCIENCE", "IT", "CS"];
const BA_KEYWORDS = ["BAP", "BSA", "BSBA", "BUSINESS", "ACCOUNTANCY", "ADMINISTRATION", "BA"];
const CRIM_KEYWORDS = ["CJEP", "BSCRIM", "CRIMINOLOGY", "CRIM", "CRIMINAL JUSTICE", "CRIMINAL"];
const EDUC_KEYWORDS = ["TEP", "BSED", "BEED", "EDUCATION", "TEACHER", "EDUC", "TEACHER EDUCATION"];
const HM_KEYWORDS = ["HMP", "BSHM", "HOSPITALITY", "HOTEL", "TOURISM", "HM"];

/**
 * Accurately determines the program code (ITP, BAP, CJEP, TEP, HMP, or OTHER)
 * from schedule item properties or raw strings.
 */
export function detectProgramCode(
  source?:
    | string
    | {
        program?: string | null;
        section?: string | null;
        course?: string | null;
        subjectCode?: string | null;
        department?: string | null;
      }
    | null
): ProgramCode {
  if (!source) return "OTHER";

  let tokens: string[] = [];

  if (typeof source === "string") {
    tokens.push(source.toUpperCase());
  } else {
    if (source.program) tokens.push(String(source.program).toUpperCase());
    if (source.course) tokens.push(String(source.course).toUpperCase());
    if (source.department) tokens.push(String(source.department).toUpperCase());
    if (source.section) tokens.push(String(source.section).toUpperCase());
    if (source.subjectCode) tokens.push(String(source.subjectCode).toUpperCase());
  }

  const combined = tokens.join(" ");

  // 1. Direct program code matches
  for (const token of tokens) {
    const clean = token.trim();
    if (clean === "ITP" || clean === "BSIT" || clean === "BSCS") return "ITP";
    if (clean === "BAP" || clean === "BSBA" || clean === "BSA") return "BAP";
    if (clean === "CJEP" || clean === "BSCRIM" || clean === "CRIM") return "CJEP";
    if (clean === "TEP" || clean === "BSED" || clean === "BEED") return "TEP";
    if (clean === "HMP" || clean === "BSHM" || clean === "HM") return "HMP";
  }

  // 2. Keyword checks across all tokens
  if (IT_KEYWORDS.some((kw) => combined.includes(kw))) return "ITP";
  if (CRIM_KEYWORDS.some((kw) => combined.includes(kw))) return "CJEP";
  if (BA_KEYWORDS.some((kw) => combined.includes(kw))) return "BAP";
  if (EDUC_KEYWORDS.some((kw) => combined.includes(kw))) return "TEP";
  if (HM_KEYWORDS.some((kw) => combined.includes(kw))) return "HMP";

  // 3. Subject code prefixes
  if (typeof source === "object" && source && source.subjectCode) {
    const code = String(source.subjectCode).toUpperCase().trim();
    if (/^(IT|CS|CC|PROG|NET|WEB|SYS|INFO)/.test(code)) return "ITP";
    if (/^(CRI|CRIM|LEA|CDI|CLJ|SOC)/.test(code)) return "CJEP";
    if (/^(BA|ACT|ACC|MGT|HRM|FIN|MRK|ENT|BM)/.test(code)) return "BAP";
    if (/^(ED|EDUC|PED|SED|EED|ENG|MATH|SCI)/.test(code)) return "TEP";
    if (/^(HM|BSHM|FNB|CUL|TOUR|HOSP)/.test(code)) return "HMP";
  }

  return "OTHER";
}

/**
 * Returns the theme object for a schedule item or program code.
 */
export function getProgramTheme(
  source?:
    | string
    | {
        program?: string | null;
        section?: string | null;
        course?: string | null;
        subjectCode?: string | null;
        department?: string | null;
      }
    | null
): ProgramTheme {
  const code = detectProgramCode(source);
  return PROGRAM_THEMES[code] || PROGRAM_THEMES.OTHER;
}

/**
 * Returns the primary color hex for a program.
 */
export function getProgramColor(
  source?:
    | string
    | {
        program?: string | null;
        section?: string | null;
        course?: string | null;
        subjectCode?: string | null;
        department?: string | null;
      }
    | null
): string {
  return getProgramTheme(source).primary;
}

/**
 * List of the 5 official collegiate programs with their themes and color names.
 */
export const OFFICIAL_PROGRAMS: ProgramTheme[] = [
  PROGRAM_THEMES.ITP,
  PROGRAM_THEMES.BAP,
  PROGRAM_THEMES.CJEP,
  PROGRAM_THEMES.TEP,
  PROGRAM_THEMES.HMP,
];
