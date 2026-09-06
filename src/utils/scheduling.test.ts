import { describe, expect, it } from "vitest";
import {
  buildAiRecommendations,
  formatAvailabilitySlotRange,
  parseTeacherAvailability,
  formatGroupedAvailability,
  validateScheduleSlot,
  parseTimeToMinutes,
  isTimeOverlapping,
} from "./scheduling";
import type { ClassScheduleItem } from "../types";

describe("buildAiRecommendations", () => {
  it("returns actionable recommendations for overloaded schedules", () => {
    const scheduleItems: ClassScheduleItem[] = [
      {
        id: "class-1",
        subjectCode: "IT101",
        subject: "Programming 1",
        day: "Monday",
        time: "08:00-09:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#2563eb",
        program: "ITP",
        section: "A",
        modality: "Face-to-Face",
      },
      {
        id: "class-2",
        subjectCode: "IT102",
        subject: "Discrete Math",
        day: "Monday",
        time: "08:00-09:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#0f766e",
        program: "ITP",
        section: "B",
        modality: "Face-to-Face",
      },
      {
        id: "class-3",
        subjectCode: "IT201",
        subject: "Database Systems",
        day: "Tuesday",
        time: "09:00-10:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#7c3aed",
        program: "ITP",
        section: "A",
        modality: "Face-to-Face",
      },
      {
        id: "class-4",
        subjectCode: "IT202",
        subject: "Web Dev",
        day: "Wednesday",
        time: "09:00-10:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#7c3aed",
        program: "ITP",
        section: "A",
        modality: "Face-to-Face",
      },
      {
        id: "class-5",
        subjectCode: "IT301",
        subject: "Software Eng",
        day: "Thursday",
        time: "09:00-10:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#7c3aed",
        program: "ITP",
        section: "A",
        modality: "Face-to-Face",
      },
    ];

    const recommendations = buildAiRecommendations(scheduleItems);

    expect(recommendations.length).toBeGreaterThan(0);
  });
});

describe("Part-Time Teacher Availability Verification & Formatting", () => {
  it("formats 12-hour availability slot ranges accurately", () => {
    expect(formatAvailabilitySlotRange("08:00-09:00")).toBe("8:00 AM - 9:00 AM");
    expect(formatAvailabilitySlotRange("05:30-07:00")).toBe("5:30 PM - 7:00 PM");
    expect(formatAvailabilitySlotRange("06:00-08:00")).toBe("6:00 PM - 8:00 PM");
    expect(formatAvailabilitySlotRange("13:00-14:00")).toBe("1:00 PM - 2:00 PM");
  });

  it("parses grouped multi-day availability strings correctly", () => {
    const raw = "Monday: 05:30-07:00 | Tuesday: 06:00-08:00 | Thursday: 05:30-07:00";
    const parsed = parseTeacherAvailability(raw);
    expect(parsed.length).toBe(3);
    expect(parsed.find((p) => p.day === "Monday")?.slots).toEqual(["05:30-07:00"]);
    expect(parsed.find((p) => p.day === "Tuesday")?.slots).toEqual(["06:00-08:00"]);
    expect(parsed.find((p) => p.day === "Thursday")?.slots).toEqual(["05:30-07:00"]);

    const grouped = formatGroupedAvailability(raw);
    expect(grouped.find((g) => g.day === "Monday")?.formattedRange).toBe("5:30 PM - 7:00 PM");
    expect(grouped.find((g) => g.day === "Tuesday")?.formattedRange).toBe("6:00 PM - 8:00 PM");
  });

  it("proactively validates part-time teacher schedule slots against registered availability", () => {
    const partTimeFaculty = [
      {
        id: "FAC-003",
        name: "Marco Sabuero",
        status: "Part-Time",
        availability: "Monday: 05:30-07:00 | Tuesday: 06:00-08:00 | Thursday: 05:30-07:00",
      },
    ];

    // Attempting schedule on Monday 05:30-07:00 (inside availability) -> VALID
    const validCandidate = {
      day: "Monday",
      time: "05:30-07:00",
      room: "R-101",
      building: "Main Building",
      faculty: "Marco Sabuero",
      facultyId: "FAC-003",
      section: "BSCS 1-A",
      modality: "Face-to-Face" as const,
    };
    const validResult = validateScheduleSlot(validCandidate, [], partTimeFaculty);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors.length).toBe(0);

    // Attempting schedule on Monday 08:00-09:00 (outside availability) -> INVALID
    const invalidTimeCandidate = {
      day: "Monday",
      time: "08:00-09:00",
      room: "R-101",
      building: "Main Building",
      faculty: "Marco Sabuero",
      facultyId: "FAC-003",
      section: "BSCS 1-A",
      modality: "Face-to-Face" as const,
    };
    const invalidTimeResult = validateScheduleSlot(invalidTimeCandidate, [], partTimeFaculty);
    expect(invalidTimeResult.valid).toBe(false);
    expect(invalidTimeResult.errors.some((e) => e.includes("availability mismatch"))).toBe(true);

    // Attempting schedule on Wednesday (unregistered day) -> INVALID
    const invalidDayCandidate = {
      day: "Wednesday",
      time: "05:30-07:00",
      room: "R-101",
      building: "Main Building",
      faculty: "Marco Sabuero",
      facultyId: "FAC-003",
      section: "BSCS 1-A",
      modality: "Face-to-Face" as const,
    };
    const invalidDayResult = validateScheduleSlot(invalidDayCandidate, [], partTimeFaculty);
    expect(invalidDayResult.valid).toBe(false);
    expect(invalidDayResult.errors.some((e) => e.includes("has not registered availability for Wednesday"))).toBe(true);
  });

  it("correctly parses 7:00 AM as morning time and handles 30-minute intervals starting at 7am", () => {
    expect(parseTimeToMinutes("07:00 AM")).toBe(420);
    expect(parseTimeToMinutes("07:00")).toBe(420);
    expect(parseTimeToMinutes("07:30 AM")).toBe(450);
    expect(parseTimeToMinutes("07:30")).toBe(450);
    expect(parseTimeToMinutes("07:00 PM")).toBe(1140);
    expect(parseTimeToMinutes("08:00 AM")).toBe(480);

    // 07:00 AM - 08:30 AM overlaps with 07:00 AM - 07:30 AM
    expect(isTimeOverlapping("07:00 AM - 08:30 AM", "07:00 AM - 07:30 AM")).toBe(true);
    expect(isTimeOverlapping("07:00 AM - 08:30 AM", "08:00 AM - 08:30 AM")).toBe(true);
    // Does not overlap with 08:30 AM - 09:00 AM
    expect(isTimeOverlapping("07:00 AM - 08:30 AM", "08:30 AM - 09:00 AM")).toBe(false);
  });
});
