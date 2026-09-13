import { describe, it, expect } from "vitest";
import {
  getExpectedSubjectDuration,
  calculateEndTimeFromStart,
  minutesToTimeString,
  validateScheduleSlot,
} from "../scheduling";
import type { SubjectItem, ClassScheduleItem } from "../../types";

describe("Subject Durations and Scheduling Logic", () => {
  const genSubject: SubjectItem = {
    code: "GE101",
    name: "Understanding the Self",
    units: 3,
    lectureHours: 1.5,
    labHours: 0,
    semester: "1st Semester",
    department: "General Education",
    program: "ALL",
    isMajor: false,
    instructor: "Mrs. Elena Ramos",
  };

  const minorSubject: SubjectItem = {
    code: "RS1",
    name: "Peace & Christian Ethics",
    units: 3,
    lectureHours: 1.5,
    labHours: 0,
    semester: "1st Semester",
    department: "General Education",
    program: "ALL",
    isMajor: false,
    instructor: "Mr. Baltazar",
  };

  const majorSubject: SubjectItem = {
    code: "IT101",
    name: "Computer Programming 1",
    units: 3,
    lectureHours: 2,
    labHours: 3,
    semester: "1st Semester",
    department: "Information Technology",
    program: "BSIT",
    isMajor: true,
    instructor: "Mr. Juan Dela Cruz",
  };

  const majorBA: SubjectItem = {
    code: "BA101",
    name: "Principles of Management",
    units: 3,
    lectureHours: 2,
    labHours: 3,
    semester: "1st Semester",
    department: "Business Administration",
    program: "BSBA",
    isMajor: true,
    instructor: "Prof. Mary Cruz",
  };

  describe("Duration Rules: Minor/Gen Ed = 1.5h, Major Lecture = 2h, Major Lab = 3h", () => {
    it("assigns exactly 1 hour 30 mins (90 min) duration for general/minor subjects", () => {
      expect(getExpectedSubjectDuration(genSubject, "Lecture")).toBe(90);
      expect(getExpectedSubjectDuration(genSubject, "Laboratory")).toBe(90); // Minors/GE are always 1.5h
      expect(getExpectedSubjectDuration(minorSubject)).toBe(90);
      expect(getExpectedSubjectDuration({ code: "PE101", isMajor: false })).toBe(90);
    });

    it("assigns exactly 2 hours (120 min) for major subject lecture sessions", () => {
      expect(getExpectedSubjectDuration(majorSubject, "Lecture")).toBe(120);
      expect(getExpectedSubjectDuration(majorBA, "Lecture")).toBe(120);
      expect(getExpectedSubjectDuration(majorSubject)).toBe(120); // Default for majors is Lecture (2h)
    });

    it("assigns exactly 3 hours (180 min) for major subject laboratory sessions", () => {
      expect(getExpectedSubjectDuration(majorSubject, "Laboratory")).toBe(180);
      expect(getExpectedSubjectDuration(majorBA, "Laboratory")).toBe(180);
      expect(getExpectedSubjectDuration(majorSubject, "lab")).toBe(180);
    });
  });

  describe("calculateEndTimeFromStart", () => {
    it("accurately calculates 1 hour 30 mins end time from start time", () => {
      expect(calculateEndTimeFromStart("07:00 AM", 90)).toBe("08:30 AM");
      expect(calculateEndTimeFromStart("08:00 AM", 90)).toBe("09:30 AM");
      expect(calculateEndTimeFromStart("01:00 PM", 90)).toBe("02:30 PM");
      expect(calculateEndTimeFromStart("05:30 PM", 90)).toBe("07:00 PM");
    });

    it("accurately calculates 2 hours end time for major lecture sessions", () => {
      expect(calculateEndTimeFromStart("07:00 AM", 120)).toBe("09:00 AM");
      expect(calculateEndTimeFromStart("08:00 AM", 120)).toBe("10:00 AM");
      expect(calculateEndTimeFromStart("01:00 PM", 120)).toBe("03:00 PM");
    });

    it("accurately calculates 3 hours end time for major laboratory sessions", () => {
      expect(calculateEndTimeFromStart("08:00 AM", 180)).toBe("11:00 AM");
      expect(calculateEndTimeFromStart("01:00 PM", 180)).toBe("04:00 PM");
      expect(calculateEndTimeFromStart("02:00 PM", 180)).toBe("05:00 PM");
    });
  });

  describe("minutesToTimeString helper", () => {
    it("formats minutes accurately into 12-hour collegiate timetable strings", () => {
      expect(minutesToTimeString(480)).toBe("08:00 AM");
      expect(minutesToTimeString(570)).toBe("09:30 AM");
      expect(minutesToTimeString(600)).toBe("10:00 AM");
      expect(minutesToTimeString(780)).toBe("01:00 PM");
      expect(minutesToTimeString(960)).toBe("04:00 PM");
    });
  });

  describe("Room & Resource Conflict Checking with Durations", () => {
    const existingSchedule: ClassScheduleItem = {
      id: "SCHED-TEST-1",
      day: "Monday",
      time: "08:00 AM - 10:00 AM", // 2-hour major lecture
      subjectCode: "IT101",
      subject: "Computer Programming 1",
      section: "BSIT 1-A",
      faculty: "Prof. Ada Lovelace",
      facultyId: "FAC-001",
      room: "COL-102",
      building: "College Building",
      modality: "Face-to-Face",
      color: "#0284c7",
    };

    const testFaculty = [
      { id: "FAC-001", name: "Prof. Ada Lovelace", status: "Full-Time" },
      { id: "FAC-002", name: "Dr. Turing", status: "Full-Time" },
    ];

    it("detects conflict when a 1.5h minor subject overlaps an existing 2h major lecture", () => {
      const candidate = {
        day: "Monday",
        time: "09:00 AM - 10:30 AM", // overlaps 08:00-10:00
        room: "COL-102",
        building: "College Building",
        faculty: "Dr. Turing",
        facultyId: "FAC-002",
        section: "BSIT 1-B",
        modality: "Face-to-Face" as const,
      };

      const result = validateScheduleSlot(candidate, [existingSchedule], testFaculty);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Room collision"))).toBe(true);
    });

    it("allows non-overlapping consecutive schedules", () => {
      const candidate = {
        day: "Monday",
        time: "10:00 AM - 11:30 AM", // Starts exactly when previous 2h lecture finishes
        room: "COL-102",
        building: "College Building",
        faculty: "Dr. Turing",
        facultyId: "FAC-002",
        section: "BSIT 1-B",
        modality: "Face-to-Face" as const,
      };

      const result = validateScheduleSlot(candidate, [existingSchedule], testFaculty);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
});
