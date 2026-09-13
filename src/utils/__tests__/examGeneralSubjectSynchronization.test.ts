import { describe, it, expect } from "vitest";
import { isGeneralSubject } from "../scheduling";

describe("General Subject Identification (isGeneralSubject)", () => {
  it("correctly detects GE subjects with or without spaces or hyphens", () => {
    expect(isGeneralSubject("GE 2")).toBe(true);
    expect(isGeneralSubject("ge 2")).toBe(true);
    expect(isGeneralSubject("GE2")).toBe(true);
    expect(isGeneralSubject("GE-101")).toBe(true);
    expect(isGeneralSubject("GE 1")).toBe(true);
    expect(isGeneralSubject({ code: "GE 2", name: "Readings in Philippine History" })).toBe(true);
    expect(isGeneralSubject({ subjectCode: "GE 4", name: "Mathematics in the Modern World" })).toBe(true);
  });

  it("correctly identifies other general education subjects (PE, NSTP, RS)", () => {
    expect(isGeneralSubject("PE 1")).toBe(true);
    expect(isGeneralSubject("NSTP 1")).toBe(true);
    expect(isGeneralSubject("RS 1")).toBe(true);
    expect(isGeneralSubject("THEOLOGY 1")).toBe(true);
  });

  it("returns false for major/specialized subjects", () => {
    expect(isGeneralSubject("IT 101")).toBe(false);
    expect(isGeneralSubject("CS 312")).toBe(false);
    expect(isGeneralSubject("ACT 201")).toBe(false);
    expect(isGeneralSubject("HM 105")).toBe(false);
    expect(isGeneralSubject({ code: "CC 102", name: "Data Structures" })).toBe(false);
  });
});

describe("General Subject Synchronization & Anti-Answer-Sharing Rules", () => {
  interface MockExam {
    id: string;
    term: string;
    examDate: string;
    time: string;
    subjectCode: string;
    subject: string;
    program: string;
    sections: string[];
    room: string;
    proctor: string;
  }

  const existingExams: MockExam[] = [
    {
      id: "exam-1",
      term: "Midterm",
      examDate: "2026-10-15",
      time: "08:00 AM - 09:30 AM",
      subjectCode: "GE 2",
      subject: "Readings in Philippine History",
      program: "BSIT",
      sections: ["BSIT 1-A"],
      room: "Room 101",
      proctor: "Prof. John Doe",
    },
  ];

  function validateGeneralSubjectTimeSlot(
    newExam: { term: string; examDate: string; time: string; subjectCode: string },
    exams: MockExam[],
    excludeExamId?: string
  ): { valid: boolean; error?: string } {
    if (!isGeneralSubject(newExam.subjectCode)) {
      return { valid: true };
    }

    const conflicting = exams.find(
      (e) =>
        e.id !== excludeExamId &&
        e.term === newExam.term &&
        e.subjectCode.trim().toUpperCase() === newExam.subjectCode.trim().toUpperCase() &&
        (e.examDate !== newExam.examDate || e.time.replace(/\s+/g, "").toUpperCase() !== newExam.time.replace(/\s+/g, "").toUpperCase())
    );

    if (conflicting) {
      return {
        valid: false,
        error: `Security Policy: All sections taking general subject ${newExam.subjectCode} must take the exam in the same time slot (${conflicting.time} on ${conflicting.examDate}) to avoid answer sharing between sections.`,
      };
    }

    return { valid: true };
  }

  it("allows scheduling when matching the exact same time slot as an existing section", () => {
    const candidate = {
      term: "Midterm",
      examDate: "2026-10-15",
      time: "08:00 AM - 09:30 AM",
      subjectCode: "GE 2",
    };

    const result = validateGeneralSubjectTimeSlot(candidate, existingExams);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("blocks scheduling GE 2 at a different time slot in the same term to prevent answer leaks", () => {
    const candidateDifferentTime = {
      term: "Midterm",
      examDate: "2026-10-15",
      time: "10:00 AM - 11:30 AM", // different time!
      subjectCode: "GE 2",
    };

    const result = validateGeneralSubjectTimeSlot(candidateDifferentTime, existingExams);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Security Policy: All sections taking general subject GE 2 must take the exam in the same time slot");
  });

  it("blocks scheduling GE 2 on a different date in the same term", () => {
    const candidateDifferentDate = {
      term: "Midterm",
      examDate: "2026-10-16", // different date!
      time: "08:00 AM - 09:30 AM",
      subjectCode: "GE 2",
    };

    const result = validateGeneralSubjectTimeSlot(candidateDifferentDate, existingExams);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Security Policy");
  });

  it("allows non-general subjects to be scheduled at different times across sections", () => {
    const candidateMajor = {
      term: "Midterm",
      examDate: "2026-10-15",
      time: "10:00 AM - 11:30 AM",
      subjectCode: "IT 101",
    };

    const result = validateGeneralSubjectTimeSlot(candidateMajor, existingExams);
    expect(result.valid).toBe(true);
  });
});

describe("Auto-Distribution of Sections into Conflict-Free Rooms in Same Slot", () => {
  it("packs multiple sections across rooms without exceeding room capacities", () => {
    interface SectionItem {
      section: string;
      program: string;
      students: number;
    }
    interface RoomItem {
      number: string;
      capacity: number;
    }

    const candidateSections: SectionItem[] = [
      { section: "BSIT 1-A", program: "BSIT", students: 35 },
      { section: "BSIT 1-B", program: "BSIT", students: 35 },
      { section: "BSBA 1-A", program: "BSBA", students: 30 },
      { section: "BSHM 1-A", program: "BSHM", students: 40 },
    ];

    const availableRooms: RoomItem[] = [
      { number: "Room 101", capacity: 40 },
      { number: "Room 102", capacity: 50 },
      { number: "Room 103", capacity: 45 },
      { number: "Room 104", capacity: 40 },
    ];

    const availableProctors = [
      { id: "P1", name: "Prof. A" },
      { id: "P2", name: "Prof. B" },
      { id: "P3", name: "Prof. C" },
      { id: "P4", name: "Prof. D" },
    ];

    // Simulate auto-distribution
    const assignments: { room: string; proctorId: string; sections: string[] }[] = [];
    const unassigned = [...candidateSections];
    let roomIdx = 0;

    while (unassigned.length > 0 && roomIdx < availableRooms.length) {
      const room = availableRooms[roomIdx];
      const proctor = availableProctors[roomIdx] || { id: "", name: "" };
      let currentCap = 0;
      const roomSections: string[] = [];

      for (let i = unassigned.length - 1; i >= 0; i--) {
        const sec = unassigned[i];
        if (currentCap + sec.students <= room.capacity) {
          roomSections.push(sec.section);
          currentCap += sec.students;
          unassigned.splice(i, 1);
        }
      }

      if (roomSections.length > 0) {
        assignments.push({
          room: room.number,
          proctorId: proctor.id,
          sections: roomSections,
        });
      }
      roomIdx++;
    }

    // All sections assigned
    expect(unassigned.length).toBe(0);
    expect(assignments.length).toBeGreaterThan(0);
    assignments.forEach((a) => {
      const room = availableRooms.find((r) => r.number === a.room)!;
      const totalStudents = a.sections.reduce((sum, sName) => {
        const s = candidateSections.find((cs) => cs.section === sName);
        return sum + (s?.students || 0);
      }, 0);
      expect(totalStudents).toBeLessThanOrEqual(room.capacity);
    });
  });
});
