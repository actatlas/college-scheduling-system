import { describe, it, expect } from "vitest";
import {
  isGeneralSubject,
  canProgramTakeSubject,
  getPairedDay,
  getDayPairLabel,
  validateScheduleSlot,
} from "../scheduling";
import type { SubjectItem, ClassScheduleItem } from "../../types";

describe("Universal General Subjects Logic", () => {
  const ge101: SubjectItem = {
    code: "GE101",
    name: "Understanding the Self",
    units: 3,
    lectureHours: 3,
    labHours: 0,
    semester: "1st Semester",
    department: "General Education",
    program: "ALL",
    isMajor: false,
    instructor: "Mrs. Elena Ramos",
    instructorId: "FAC-006",
  };

  const ge102WithLegacyProg: SubjectItem = {
    code: "GE102",
    name: "Purposive Communication",
    units: 3,
    lectureHours: 3,
    labHours: 0,
    semester: "1st Semester",
    department: "General Education",
    program: "BSIT", // legacy seed may have had BSIT
    isMajor: false,
    instructor: "Mrs. Elena Ramos",
    instructorId: "FAC-006",
  };

  const rs1: SubjectItem = {
    code: "RS1",
    name: "Religious Studies 1",
    units: 3,
    lectureHours: 3,
    labHours: 0,
    semester: "1st Semester",
    department: "General Education",
    program: "ALL",
    isMajor: false,
    instructor: "Faculty Staff",
  };

  const pe1: SubjectItem = {
    code: "PE101",
    name: "Physical Fitness and Wellness",
    units: 2,
    lectureHours: 2,
    labHours: 0,
    semester: "1st Semester",
    department: "General Education",
    program: "ALL",
    isMajor: false,
    instructor: "Faculty Staff",
  };

  const majorIT: SubjectItem = {
    code: "IT101",
    name: "Computer Programming 1",
    units: 3,
    lectureHours: 2,
    labHours: 3,
    semester: "1st Semester",
    department: "Information Technology",
    program: "BSIT",
    isMajor: true,
    instructor: "Faculty Staff",
  };

  const majorBA: SubjectItem = {
    code: "BA101",
    name: "Principles of Management",
    units: 3,
    lectureHours: 3,
    labHours: 0,
    semester: "1st Semester",
    department: "Business Administration",
    program: "BSBA",
    isMajor: true,
    instructor: "Faculty Staff",
  };

  it("identifies General Education subjects universally regardless of stored program", () => {
    expect(isGeneralSubject(ge101)).toBe(true);
    expect(isGeneralSubject(ge102WithLegacyProg)).toBe(true);
    expect(isGeneralSubject(rs1)).toBe(true);
    expect(isGeneralSubject(pe1)).toBe(true);
    expect(isGeneralSubject(majorIT)).toBe(false);
    expect(isGeneralSubject(majorBA)).toBe(false);
  });

  it("allows ALL collegiate programs (ITP, BAP, CJEP, TEP, HMP) to take general subjects", () => {
    const allPrograms = ["ITP", "BSIT", "BAP", "BSBA", "CJEP", "CRIM", "TEP", "EDUC", "HMP", "BSHM"];

    for (const prog of allPrograms) {
      expect(canProgramTakeSubject(ge101, prog)).toBe(true);
      expect(canProgramTakeSubject(ge102WithLegacyProg, prog)).toBe(true);
      expect(canProgramTakeSubject(rs1, prog)).toBe(true);
      expect(canProgramTakeSubject(pe1, prog)).toBe(true);
    }
  });

  it("restricts major subjects to their respective program", () => {
    // IT101 can be taken by BSIT / ITP
    expect(canProgramTakeSubject(majorIT, "BSIT")).toBe(true);
    // IT101 cannot be taken by other programs
    expect(canProgramTakeSubject(majorIT, "BSBA")).toBe(false);
    expect(canProgramTakeSubject(majorIT, "CJEP")).toBe(false);
    expect(canProgramTakeSubject(majorIT, "TEP")).toBe(false);
    expect(canProgramTakeSubject(majorIT, "HMP")).toBe(false);

    // BA101 can be taken by BSBA / BAP
    expect(canProgramTakeSubject(majorBA, "BSBA")).toBe(true);
    expect(canProgramTakeSubject(majorBA, "BSIT")).toBe(false);
  });
});

describe("Paired Day Scheduling Logic", () => {
  it("pairs Monday with Thursday (M-Th)", () => {
    expect(getPairedDay("Monday")).toBe("Thursday");
    expect(getDayPairLabel("Monday")).toBe("Monday & Thursday (M-Th)");
  });

  it("pairs Tuesday with Friday (T-F)", () => {
    expect(getPairedDay("Tuesday")).toBe("Friday");
    expect(getDayPairLabel("Tuesday")).toBe("Tuesday & Friday (T-F)");
  });

  it("treats Wednesday and Saturday as standalone schedule days (no automatic pairing)", () => {
    expect(getPairedDay("Wednesday")).toBeNull();
    expect(getPairedDay("Saturday")).toBeNull();
    expect(getDayPairLabel("Wednesday")).toBe("Wednesday");
    expect(getDayPairLabel("Saturday")).toBe("Saturday");
  });

  it("validates paired day availability without cross-day collisions", () => {
    const mondaySchedule: ClassScheduleItem = {
      id: "SCHED-M1",
      day: "Monday",
      time: "08:00 AM - 09:30 AM",
      subjectCode: "GE101",
      subject: "Understanding the Self",
      section: "BSIT 1-A",
      faculty: "Dr. Alan Turing",
      facultyId: "FAC-003",
      room: "COL-101",
      building: "College Building",
      modality: "Face-to-Face",
      program: "BSIT",
      color: "#800000",
    };

    const thursdaySchedule: ClassScheduleItem = {
      id: "SCHED-TH1",
      day: "Thursday",
      time: "08:00 AM - 09:30 AM",
      subjectCode: "GE101",
      subject: "Understanding the Self",
      section: "BSIT 1-A",
      faculty: "Dr. Alan Turing",
      facultyId: "FAC-003",
      room: "COL-101",
      building: "College Building",
      modality: "Face-to-Face",
      program: "BSIT",
      color: "#800000",
    };

    const existingSchedules = [mondaySchedule, thursdaySchedule];

    // Attempting to schedule another class at the same time on Monday in COL-101 should conflict
    const conflictResultMon = validateScheduleSlot(
      {
        day: "Monday",
        time: "08:00 AM - 09:30 AM",
        room: "COL-101",
        building: "College Building",
        faculty: "Mrs. Elena Ramos",
        facultyId: "FAC-006",
        section: "BSBA 1-A",
        modality: "Face-to-Face",
      },
      existingSchedules
    );
    expect(conflictResultMon.valid).toBe(false);
    expect(conflictResultMon.errors.some((e) => e.includes("Room COL-101 is already occupied"))).toBe(true);

    // But scheduling in COL-102 (different room) on Thursday should pass cleanly
    const freeRoomResult = validateScheduleSlot(
      {
        day: "Thursday",
        time: "08:00 AM - 09:30 AM",
        room: "COL-102",
        building: "College Building",
        faculty: "Mrs. Elena Ramos",
        facultyId: "FAC-006",
        section: "BSBA 1-A",
        modality: "Face-to-Face",
      },
      existingSchedules
    );
    expect(freeRoomResult.valid).toBe(true);
    expect(freeRoomResult.errors.length).toBe(0);
  });
});
