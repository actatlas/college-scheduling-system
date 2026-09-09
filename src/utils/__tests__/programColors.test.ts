import { describe, it, expect } from "vitest";
import {
  detectProgramCode,
  getProgramTheme,
  getProgramColor,
} from "../programColors";

describe("Program Color Coding Utility", () => {
  it("accurately detects and assigns Maroon to ITP", () => {
    expect(detectProgramCode("ITP")).toBe("ITP");
    expect(detectProgramCode({ program: "BSIT" })).toBe("ITP");
    expect(detectProgramCode({ subjectCode: "IT101" })).toBe("ITP");
    expect(detectProgramCode({ section: "BSIT 1-A" })).toBe("ITP");

    const theme = getProgramTheme("ITP");
    expect(theme.colorName).toBe("Maroon");
    expect(theme.primary).toBe("#800000");
    expect(getProgramColor({ program: "ITP" })).toBe("#800000");
  });

  it("accurately detects and assigns Yellow to BAP", () => {
    expect(detectProgramCode("BAP")).toBe("BAP");
    expect(detectProgramCode({ program: "BSBA" })).toBe("BAP");
    expect(detectProgramCode({ section: "BSBA 2-B" })).toBe("BAP");
    expect(detectProgramCode({ subjectCode: "BA101" })).toBe("BAP");

    const theme = getProgramTheme("BAP");
    expect(theme.colorName).toBe("Yellow");
    expect(theme.primary).toBe("#d97706");
    expect(getProgramColor("BAP")).toBe("#d97706");
  });

  it("accurately detects and assigns Dark Blue to CJEP", () => {
    expect(detectProgramCode("CJEP")).toBe("CJEP");
    expect(detectProgramCode({ program: "BSCRIM" })).toBe("CJEP");
    expect(detectProgramCode({ section: "BSCRIM 3-A" })).toBe("CJEP");
    expect(detectProgramCode({ subjectCode: "CRIM101" })).toBe("CJEP");

    const theme = getProgramTheme("CJEP");
    expect(theme.colorName).toBe("Dark Blue");
    expect(theme.primary).toBe("#172554");
    expect(getProgramColor("CJEP")).toBe("#172554");
  });

  it("accurately detects and assigns Blue to TEP", () => {
    expect(detectProgramCode("TEP")).toBe("TEP");
    expect(detectProgramCode({ program: "BSED" })).toBe("TEP");
    expect(detectProgramCode({ section: "BEED 1-A" })).toBe("TEP");
    expect(detectProgramCode({ subjectCode: "EDUC201" })).toBe("TEP");

    const theme = getProgramTheme("TEP");
    expect(theme.colorName).toBe("Blue");
    expect(theme.primary).toBe("#2563eb");
    expect(getProgramColor("TEP")).toBe("#2563eb");
  });

  it("accurately detects and assigns Green to HMP", () => {
    expect(detectProgramCode("HMP")).toBe("HMP");
    expect(detectProgramCode({ program: "BSHM" })).toBe("HMP");
    expect(detectProgramCode({ section: "BSHM 1-B" })).toBe("HMP");
    expect(detectProgramCode({ subjectCode: "HM101" })).toBe("HMP");

    const theme = getProgramTheme("HMP");
    expect(theme.colorName).toBe("Green");
    expect(theme.primary).toBe("#15803d");
    expect(getProgramColor("HMP")).toBe("#15803d");
  });

  it("provides fallback for general education or unknown subjects", () => {
    expect(detectProgramCode("GENED")).toBe("OTHER");
    const theme = getProgramTheme("GENED");
    expect(theme.code).toBe("OTHER");
    expect(theme.colorName).toBe("Slate");
    expect(theme.primary).toBe("#64748b");
  });
});
