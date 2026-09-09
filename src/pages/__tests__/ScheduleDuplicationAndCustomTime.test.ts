import { describe, it, expect } from "vitest";
import { getPairedDay, parseTimeToMinutes } from "../../utils/scheduling";
import { getProgramTheme } from "../../utils/programColors";

describe("Schedule Duplication and Custom Time Logic", () => {
  it("computes custom time intervals correctly for Start and End selections", () => {
    const startStr = "08:00 AM";
    const endStr = "10:30 AM";
    const startMin = parseTimeToMinutes(startStr);
    const endMin = parseTimeToMinutes(endStr);
    const diff = endMin - startMin;
    expect(diff).toBe(150); // 2.5 hours
    const hours = diff / 60;
    expect(hours).toBe(2.5);
  });

  it("suggests the paired collegiate day when duplicating a schedule", () => {
    expect(getPairedDay("Monday")).toBe("Friday");
    expect(getPairedDay("Tuesday")).toBe("Friday");
    expect(getPairedDay("Wednesday")).toBe("Saturday");
    expect(getPairedDay("Thursday")).toBe("Friday");
    expect(getPairedDay("Friday")).toBe("Monday");
    expect(getPairedDay("Saturday")).toBe("Wednesday");
  });

  it("extracts clean program codes without description text for badges", () => {
    const itpTheme = getProgramTheme({ program: "BSIT", section: "BSIT 1-A" });
    expect(itpTheme.code).toBe("ITP");
    expect(itpTheme.primary).toBe("#800000");

    const bapTheme = getProgramTheme({ program: "BSBA", section: "BSBA 2-A" });
    expect(bapTheme.code).toBe("BAP");
    expect(bapTheme.primary).toBe("#d97706");

    const cjepTheme = getProgramTheme({ program: "BSCRIM", section: "CRIM 1-A" });
    expect(cjepTheme.code).toBe("CJEP");
    expect(cjepTheme.primary).toBe("#172554");
  });
});
