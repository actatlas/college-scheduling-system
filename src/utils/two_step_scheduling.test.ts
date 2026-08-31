import { describe, expect, it } from "vitest";
import {
  isTimeOverlapping,
  parseTimeToMinutes,
  validateScheduleSlot,
  parseTeacherAvailability,
} from "./scheduling";
import type { ClassScheduleItem } from "../types";

describe("Two-Step Scheduling Engine & Availability Filtering", () => {
  describe("isTimeOverlapping & parseTimeToMinutes", () => {
    it("converts 24-hour and 12-hour strings to accurate minutes from midnight", () => {
      expect(parseTimeToMinutes("08:00")).toBe(480);
      expect(parseTimeToMinutes("08:30")).toBe(510);
      expect(parseTimeToMinutes("13:00")).toBe(780);
      expect(parseTimeToMinutes("01:00 PM")).toBe(780);
      expect(parseTimeToMinutes("08:00 AM")).toBe(480);
      // In college timetables, single-digit 1-7 without am/pm are afternoon (1:00 PM - 7:00 PM)
      expect(parseTimeToMinutes("01:00")).toBe(780);
    });

    it("correctly flags overlapping time slots", () => {
      // Direct overlap
      expect(isTimeOverlapping("08:00-09:30", "09:00-10:30")).toBe(true);
      // Identical
      expect(isTimeOverlapping("08:00-09:30", "08:00-09:30")).toBe(true);
      // Containing slot
      expect(isTimeOverlapping("08:00-11:00", "09:00-10:00")).toBe(true);
      // 12-hour AM/PM format (common in exam schedules)
      expect(isTimeOverlapping("08:00 AM - 10:00 AM", "09:00 AM - 11:00 AM")).toBe(true);
    });

    it("correctly identifies consecutive, non-overlapping periods", () => {
      // 08:00-09:30 ends exactly when 09:30-11:00 starts
      expect(isTimeOverlapping("08:00-09:30", "09:30-11:00")).toBe(false);
      // Morning vs afternoon
      expect(isTimeOverlapping("08:00-09:30", "01:00-02:30")).toBe(false);
    });
  });

  describe("validateScheduleSlot - Resource Conflict Prevention", () => {
    const existingSchedules: ClassScheduleItem[] = [
      {
        id: "sched-1",
        day: "Monday",
        time: "08:00-09:30",
        subjectCode: "IT101",
        subject: "Introduction to Computing",
        section: "BSIT 1-A",
        faculty: "Prof. Ada Lovelace",
        facultyId: "FAC-001",
        room: "COL-101",
        building: "College Building",
        modality: "Face-to-Face",
        color: "#0284c7",
      },
      {
        id: "sched-2",
        day: "Monday",
        time: "08:00-09:30",
        subjectCode: "BA101",
        subject: "Principles of Management",
        section: "BSBA 1-A",
        faculty: "Dr. Peter Drucker",
        facultyId: "FAC-002",
        room: "Virtual Room",
        building: "College Building",
        modality: "Online",
        color: "#059669",
      },
    ];

    it("prevents scheduling an already-occupied instructor at overlapping time", () => {
      const candidate = {
        day: "Monday",
        time: "08:00-09:30",
        room: "COL-102",
        building: "College Building",
        faculty: "Prof. Ada Lovelace",
        facultyId: "FAC-001",
        section: "BSIT 1-B",
        modality: "Face-to-Face" as const,
      };

      const result = validateScheduleSlot(candidate, existingSchedules);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Faculty double-booking"))).toBe(true);
    });

    it("prevents assigning an occupied physical room at overlapping time", () => {
      const candidate = {
        day: "Monday",
        time: "08:00-09:30",
        room: "COL-101", // COL-101 is already taken by sched-1
        building: "College Building",
        faculty: "Mr. Charles Babbage",
        facultyId: "FAC-003",
        section: "BSIT 1-B",
        modality: "Face-to-Face" as const,
      };

      const result = validateScheduleSlot(candidate, existingSchedules);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Room collision"))).toBe(true);
    });

    it("prevents scheduling a section with a conflicting class", () => {
      const candidate = {
        day: "Monday",
        time: "08:00-09:30",
        room: "COL-103",
        building: "College Building",
        faculty: "Mr. Charles Babbage",
        facultyId: "FAC-003",
        section: "BSIT 1-A", // BSIT 1-A already has sched-1
        modality: "Face-to-Face" as const,
      };

      const result = validateScheduleSlot(candidate, existingSchedules);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Section overlap"))).toBe(true);
    });

    it("allows conflict-free candidate with available teacher, room, and section", () => {
      const candidate = {
        day: "Monday",
        time: "08:00-09:30",
        room: "COL-201",
        building: "College Building",
        faculty: "Mr. Charles Babbage",
        facultyId: "FAC-003",
        section: "BSIT 2-A",
        modality: "Face-to-Face" as const,
      };

      const result = validateScheduleSlot(candidate, existingSchedules);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("allows the same instructor or room on a different time or different day", () => {
      const candidate = {
        day: "Monday",
        time: "09:30-11:00", // Consecutive, non-overlapping slot
        room: "COL-101",
        building: "College Building",
        faculty: "Prof. Ada Lovelace",
        facultyId: "FAC-001",
        section: "BSIT 1-B",
        modality: "Face-to-Face" as const,
      };

      const result = validateScheduleSlot(candidate, existingSchedules);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe("Part-Time Availability Parsing & Verification", () => {
    it("parses multi-day availability strings correctly", () => {
      const raw = "Monday: 08:00-12:00 | Wednesday: 13:00-17:00";
      const parsed = parseTeacherAvailability(raw);

      expect(parsed.length).toBe(2);
      expect(parsed[0].day).toBe("Monday");
      expect(parsed[0].slots).toContain("08:00-12:00");
      expect(parsed[1].day).toBe("Wednesday");
      expect(parsed[1].slots).toContain("13:00-17:00");
    });
  });

  describe("Multi-Program Examination Scheduling & Assignment Grouping", () => {
    interface MockExamAssignment {
      id: string;
      subjectCode: string;
      subject: string;
      term: string;
      examDate: string;
      time: string;
      program: string;
      proctor: string;
      proctorId: string;
      room: string;
      sections: string[];
    }

    const ge1ExamAssignments: MockExamAssignment[] = [
      {
        id: "exam-crim-1",
        subjectCode: "GE1",
        subject: "Understanding the Self",
        term: "Midterm",
        examDate: "2026-03-20",
        time: "09:00 AM - 10:00 AM",
        program: "CRIM",
        proctor: "Teacher A",
        proctorId: "FAC-A",
        room: "Room 101",
        sections: ["CRIM 1A", "CRIM 1B"],
      },
      {
        id: "exam-itp-1",
        subjectCode: "GE1",
        subject: "Understanding the Self",
        term: "Midterm",
        examDate: "2026-03-20",
        time: "09:00 AM - 10:00 AM",
        program: "ITP",
        proctor: "Teacher B",
        proctorId: "FAC-B",
        room: "Room 102",
        sections: ["ITP 1A", "ITP 1B"],
      },
      {
        id: "exam-hmp-1",
        subjectCode: "GE1",
        subject: "Understanding the Self",
        term: "Midterm",
        examDate: "2026-03-20",
        time: "09:00 AM - 10:00 AM",
        program: "HMP",
        proctor: "Teacher C",
        proctorId: "FAC-C",
        room: "Room 103",
        sections: ["HMP 1A"],
      },
      {
        id: "exam-educ-1",
        subjectCode: "GE1",
        subject: "Understanding the Self",
        term: "Midterm",
        examDate: "2026-03-20",
        time: "09:00 AM - 10:00 AM",
        program: "EDUC",
        proctor: "Teacher D",
        proctorId: "FAC-D",
        room: "Room 104",
        sections: ["EDUC 1A"],
      },
      {
        id: "exam-bsba-1",
        subjectCode: "GE1",
        subject: "Understanding the Self",
        term: "Midterm",
        examDate: "2026-03-20",
        time: "09:00 AM - 10:00 AM",
        program: "BSBA",
        proctor: "Teacher E",
        proctorId: "FAC-E",
        room: "Room 105",
        sections: ["BSBA 1A"],
      },
    ];

    it("groups multiple program assignments under ONE shared GE1 examination session", () => {
      // Grouping by subject and shared date & time
      const subjectMap = new Map<string, any>();

      for (const exam of ge1ExamAssignments) {
        if (!subjectMap.has(exam.subjectCode)) {
          subjectMap.set(exam.subjectCode, {
            subjectCode: exam.subjectCode,
            subject: exam.subject,
            sessions: new Map<string, any>(),
          });
        }
        const subjectEntry = subjectMap.get(exam.subjectCode);
        const sessionKey = `${exam.term}::${exam.examDate}::${exam.time}`;

        if (!subjectEntry.sessions.has(sessionKey)) {
          subjectEntry.sessions.set(sessionKey, {
            term: exam.term,
            examDate: exam.examDate,
            time: exam.time,
            assignments: [],
          });
        }
        subjectEntry.sessions.get(sessionKey).assignments.push(exam);
      }

      // Assertions
      expect(subjectMap.size).toBe(1);
      const ge1 = subjectMap.get("GE1");
      expect(ge1).toBeDefined();
      expect(ge1.sessions.size).toBe(1);

      const session = ge1.sessions.get("Midterm::2026-03-20::09:00 AM - 10:00 AM");
      expect(session).toBeDefined();
      expect(session.assignments.length).toBe(5);

      // Verify all 5 distinct program assignments exist under this ONE examination
      const programs = session.assignments.map((a: any) => a.program);
      expect(programs).toEqual(["CRIM", "ITP", "HMP", "EDUC", "BSBA"]);

      // Verify distinct rooms and proctors
      const rooms = session.assignments.map((a: any) => a.room);
      expect(new Set(rooms).size).toBe(5);
      expect(rooms).toEqual(["Room 101", "Room 102", "Room 103", "Room 104", "Room 105"]);

      const proctors = session.assignments.map((a: any) => a.proctor);
      expect(new Set(proctors).size).toBe(5);
      expect(proctors).toEqual(["Teacher A", "Teacher B", "Teacher C", "Teacher D", "Teacher E"]);
    });

    it("prevents double-booking Teacher A or Room 101 for another assignment at the same time", () => {
      const isProctorAvailable = (proctorId: string, examDate: string, time: string) => {
        return !ge1ExamAssignments.some(
          (e) => e.proctorId === proctorId && e.examDate === examDate && isTimeOverlapping(e.time, time)
        );
      };

      const isRoomAvailable = (room: string, examDate: string, time: string) => {
        return !ge1ExamAssignments.some(
          (e) => e.room === room && e.examDate === examDate && isTimeOverlapping(e.time, time)
        );
      };

      // Teacher A and Room 101 are already busy at 09:00 AM - 10:00 AM
      expect(isProctorAvailable("FAC-A", "2026-03-20", "09:00 AM - 10:00 AM")).toBe(false);
      expect(isRoomAvailable("Room 101", "2026-03-20", "09:00 AM - 10:00 AM")).toBe(false);

      // Unassigned Teacher F and Room 106 are available at that time
      expect(isProctorAvailable("FAC-F", "2026-03-20", "09:00 AM - 10:00 AM")).toBe(true);
      expect(isRoomAvailable("Room 106", "2026-03-20", "09:00 AM - 10:00 AM")).toBe(true);

      // Teacher A and Room 101 are available at a different time slot (e.g. 10:30 AM - 11:30 AM)
      expect(isProctorAvailable("FAC-A", "2026-03-20", "10:30 AM - 11:30 AM")).toBe(true);
      expect(isRoomAvailable("Room 101", "2026-03-20", "10:30 AM - 11:30 AM")).toBe(true);
    });

    it("prevents assigning the same section to multiple rooms simultaneously", () => {
      const isSectionAvailable = (secName: string, examDate: string, time: string) => {
        return !ge1ExamAssignments.some(
          (e) => e.sections.includes(secName) && e.examDate === examDate && isTimeOverlapping(e.time, time)
        );
      };

      // "CRIM 1A" is already assigned to Room 101
      expect(isSectionAvailable("CRIM 1A", "2026-03-20", "09:00 AM - 10:00 AM")).toBe(false);

      // Unassigned section "CRIM 2A" is available
      expect(isSectionAvailable("CRIM 2A", "2026-03-20", "09:00 AM - 10:00 AM")).toBe(true);
    });

    it("proactively blocks advancing to Step 2 if any required resource is 0", () => {
      const checkStep1Guards = (facultyCount: number, roomCount: number, sectionCount: number) => {
        const canProceed = facultyCount > 0 && roomCount > 0 && sectionCount > 0;
        let errorMessage = "";
        if (sectionCount === 0) {
          errorMessage = "No available sections taking CRIM 101 at this time.";
        } else if (facultyCount === 0) {
          errorMessage = "No available faculty for this schedule.";
        } else if (roomCount === 0) {
          errorMessage = "No available rooms for this schedule.";
        }
        return { canProceed, errorMessage };
      };

      // Case 1: 0 sections available
      const r1 = checkStep1Guards(5, 5, 0);
      expect(r1.canProceed).toBe(false);
      expect(r1.errorMessage).toBe("No available sections taking CRIM 101 at this time.");

      // Case 2: 0 faculty available
      const r2 = checkStep1Guards(0, 5, 2);
      expect(r2.canProceed).toBe(false);
      expect(r2.errorMessage).toBe("No available faculty for this schedule.");

      // Case 3: 0 rooms available
      const r3 = checkStep1Guards(5, 0, 2);
      expect(r3.canProceed).toBe(false);
      expect(r3.errorMessage).toBe("No available rooms for this schedule.");

      // Case 4: All available >= 1
      const r4 = checkStep1Guards(5, 8, 3);
      expect(r4.canProceed).toBe(true);
      expect(r4.errorMessage).toBe("");
    });

    it("proactively revalidates copied examination schedule template before saving", () => {
      // Existing exams in database for target date 2026-11-20
      const existingTargetExams = [
        {
          id: "target-exam-1",
          subjectCode: "MATH101",
          term: "Final",
          examDate: "2026-11-20",
          time: "09:00 AM - 10:00 AM",
          proctorId: "FAC-A", // Teacher A is busy
          proctor: "Teacher A",
          room: "Room 101", // Room 101 is busy
          synchronizedSections: ["BSBA 2A"],
        },
      ];

      // Revalidate template assignment: CRIM with Teacher A in Room 101
      const isProctorFree = !existingTargetExams.some(
        (e) => e.examDate === "2026-11-20" && isTimeOverlapping(e.time, "09:00 AM - 10:00 AM") && e.proctorId === "FAC-A"
      );
      const isRoomFree = !existingTargetExams.some(
        (e) => e.examDate === "2026-11-20" && isTimeOverlapping(e.time, "09:00 AM - 10:00 AM") && e.room === "Room 101"
      );

      expect(isProctorFree).toBe(false); // Teacher A is occupied on target date
      expect(isRoomFree).toBe(false); // Room 101 is occupied on target date

      // Manual override with Teacher F and Room 106
      const isOverrideProctorFree = !existingTargetExams.some(
        (e) => e.examDate === "2026-11-20" && isTimeOverlapping(e.time, "09:00 AM - 10:00 AM") && e.proctorId === "FAC-F"
      );
      const isOverrideRoomFree = !existingTargetExams.some(
        (e) => e.examDate === "2026-11-20" && isTimeOverlapping(e.time, "09:00 AM - 10:00 AM") && e.room === "Room 106"
      );

      expect(isOverrideProctorFree).toBe(true);
      expect(isOverrideRoomFree).toBe(true);
    });

    it("prevents duplicate examination schedules for the same subject, term, and section", () => {
      const existingExams = [
        {
          id: "ex-dup-1",
          subjectCode: "GE1",
          term: "Midterm",
          examDate: "2026-03-20",
          time: "09:00 AM - 10:00 AM",
          synchronizedSections: ["CRIM 1A", "CRIM 1B"],
        },
      ];

      const checkDuplicateExam = (subjectCode: string, term: string, sections: string[]) => {
        return existingExams.some(
          (e) =>
            e.subjectCode === subjectCode &&
            e.term === term &&
            e.synchronizedSections.some((s) => sections.includes(s))
        );
      };

      // Attempting to schedule GE1 Midterm for CRIM 1A again
      expect(checkDuplicateExam("GE1", "Midterm", ["CRIM 1A"])).toBe(true);

      // Scheduling GE1 Final for CRIM 1A is permitted (different term)
      expect(checkDuplicateExam("GE1", "Final", ["CRIM 1A"])).toBe(false);

      // Scheduling GE1 Midterm for ITP 1A is permitted (different section)
      expect(checkDuplicateExam("GE1", "Midterm", ["ITP 1A"])).toBe(false);
    });

    it("automatically makes General Education subjects available to all collegiate programs", () => {
      const programs = ["BSIT", "BSBA", "CRIM", "BSHM", "EDUC"];
      const geSubject = {
        code: "GE1",
        name: "Understanding the Self",
        isMajor: false,
        program: "ALL",
      };

      const majorSubject = {
        code: "IT101",
        name: "Introduction to Computing",
        isMajor: true,
        program: "BSIT",
      };

      const isSubjectAvailableForProgram = (sub: typeof geSubject, prog: string) => {
        if (!sub.isMajor || sub.program === "ALL") return true;
        return sub.program === prog;
      };

      // GE1 is available to ALL programs
      for (const p of programs) {
        expect(isSubjectAvailableForProgram(geSubject, p)).toBe(true);
      }

      // IT101 is available ONLY to BSIT
      expect(isSubjectAvailableForProgram(majorSubject, "BSIT")).toBe(true);
      expect(isSubjectAvailableForProgram(majorSubject, "CRIM")).toBe(false);
      expect(isSubjectAvailableForProgram(majorSubject, "BSBA")).toBe(false);
    });

    it("validates degree course duration presets and custom 'Other' inputs", () => {
      const validateDegreeDuration = (mode: string, customVal?: string) => {
        const finalYear = mode === "other" ? Number(customVal) : Number(mode);
        if (!finalYear || isNaN(finalYear) || finalYear < 1 || finalYear > 10 || !Number.isInteger(finalYear)) {
          return { valid: false, error: "Please enter a valid course duration between 1 and 10 years." };
        }
        return { valid: true, year: finalYear };
      };

      expect(validateDegreeDuration("4").valid).toBe(true);
      expect(validateDegreeDuration("3").valid).toBe(true);
      expect(validateDegreeDuration("5").valid).toBe(true);
      expect(validateDegreeDuration("2").valid).toBe(true);

      // Custom "Other" duration: 6 years is valid
      const rCustom = validateDegreeDuration("other", "6");
      expect(rCustom.valid).toBe(true);
      expect(rCustom.year).toBe(6);

      // Invalid custom durations
      expect(validateDegreeDuration("other", "0").valid).toBe(false);
      expect(validateDegreeDuration("other", "-2").valid).toBe(false);
      expect(validateDegreeDuration("other", "15").valid).toBe(false);
      expect(validateDegreeDuration("other", "abc").valid).toBe(false);
    });

    it("proactively validates room capacity against section headcount before saving", () => {
      const section = { name: "BSIT 1A", headcount: 35 };
      const rooms = [
        { number: "LAB-01", capacity: 40 },
        { number: "LAB-02", capacity: 24 },
        { number: "LAB-03", capacity: 35 },
      ];

      const checkRoomCapacity = (roomCap: number, headcount: number) => {
        const isSufficient = roomCap >= headcount;
        const warning = !isSufficient
          ? `⚠ Room capacity (${roomCap}) is smaller than the section student headcount (${headcount}).`
          : "";
        return { isSufficient, warning };
      };

      // LAB-01 (40) vs 35 -> allowed
      expect(checkRoomCapacity(rooms[0].capacity, section.headcount).isSufficient).toBe(true);

      // LAB-02 (24) vs 35 -> rejected with warning
      const r2 = checkRoomCapacity(rooms[1].capacity, section.headcount);
      expect(r2.isSufficient).toBe(false);
      expect(r2.warning).toContain("Room capacity (24) is smaller than the section student headcount (35)");

      // LAB-03 (35) vs 35 -> allowed
      expect(checkRoomCapacity(rooms[2].capacity, section.headcount).isSufficient).toBe(true);
    });

    it("automatically populates the active central academic period into section registration", () => {
      const activePeriod = {
        schoolYear: "2026-2027",
        semester: "1st Semester",
      };

      const createDefaultSectionForm = (program: string) => ({
        course: program,
        section: `${program} 1-A`,
        yearLevel: "1",
        students: "35",
        schoolYear: activePeriod.schoolYear,
        semester: activePeriod.semester,
      });

      const sectionForm = createDefaultSectionForm("BSIT");
      expect(sectionForm.schoolYear).toBe("2026-2027");
      expect(sectionForm.semester).toBe("1st Semester");

      // Historical section remains intact when active period advances
      const historicalSection = {
        id: 10,
        section: "BSIT 1-A",
        schoolYear: "2025-2026",
        semester: "2nd Semester",
      };

      activePeriod.semester = "2nd Semester";
      const newSectionForm = createDefaultSectionForm("BSIT");
      expect(newSectionForm.semester).toBe("2nd Semester");
      expect(historicalSection.schoolYear).toBe("2025-2026"); // Historical unchanged
    });

    it("proactively enforces bidirectional Program and Course filtering for subjects", () => {
      const courses = [
        { code: "BSIT", name: "BS in Information Technology", programCode: "ITP" },
        { code: "BSHM", name: "BS in Hospitality Management", programCode: "HMP" },
        { code: "BSCRIM", name: "BS in Criminology", programCode: "CRIM" },
        { code: "BSBA", name: "BS in Business Administration", programCode: "BSBA" },
      ];

      // When Program HMP is selected, courses are filtered to HMP
      const filterCoursesByProgram = (prog: string) =>
        courses.filter((c) => c.programCode === prog || c.code.includes(prog));

      const hmpCourses = filterCoursesByProgram("HMP");
      expect(hmpCourses.length).toBe(1);
      expect(hmpCourses[0].code).toBe("BSHM");

      // Vice versa: when Course BSHM is selected, program is automatically determined as HMP
      const determineProgramFromCourse = (courseCode: string) => {
        const found = courses.find((c) => c.code === courseCode);
        return found?.programCode || "ALL";
      };

      expect(determineProgramFromCourse("BSHM")).toBe("HMP");
      expect(determineProgramFromCourse("BSIT")).toBe("ITP");
      expect(determineProgramFromCourse("BSCRIM")).toBe("CRIM");
    });

    it("ensures newly registered subjects initially start with UNASSIGNED instructor", () => {
      const createNewSubjectForm = (isMajor: boolean, prog: string, course: string) => ({
        code: "HM101",
        name: "Introduction to Hospitality Management",
        isMajor,
        program: isMajor ? prog : "ALL",
        courseCode: isMajor ? course : "ALL",
        instructorId: "",
        instructor: "Unassigned",
      });

      const newSubject = createNewSubjectForm(true, "HMP", "BSHM");
      expect(newSubject.instructorId).toBe("");
      expect(newSubject.instructor).toBe("Unassigned");
      expect(newSubject.program).toBe("HMP");
      expect(newSubject.courseCode).toBe("BSHM");
    });

    it("ensures Online class mode does not require physical rooms or trigger room capacity conflicts", () => {
      const validateClassSchedule = (candidate: {
        modality: "Face-to-Face" | "Online";
        room?: string;
        roomCapacity?: number;
        sectionHeadcount: number;
        teacherId: string;
        teacherIsBooked: boolean;
      }) => {
        const errors: string[] = [];

        // Teacher double-booking check applies to BOTH Online and Face-to-Face
        if (candidate.teacherIsBooked) {
          errors.push("Faculty double-booking detected");
        }

        // Room capacity and physical room requirement ONLY apply to Face-to-Face
        if (candidate.modality === "Face-to-Face") {
          if (!candidate.room) {
            errors.push("Physical room is required for Face-to-Face classes");
          } else if (candidate.roomCapacity && candidate.roomCapacity < candidate.sectionHeadcount) {
            errors.push(
              `Room capacity (${candidate.roomCapacity}) is smaller than section headcount (${candidate.sectionHeadcount})`
            );
          }
        }

        return {
          valid: errors.length === 0,
          errors,
        };
      };

      // Face-to-Face with undersized room: fails
      const f2fResult = validateClassSchedule({
        modality: "Face-to-Face",
        room: "LAB-02",
        roomCapacity: 24,
        sectionHeadcount: 35,
        teacherId: "FAC-1",
        teacherIsBooked: false,
      });
      expect(f2fResult.valid).toBe(false);
      expect(f2fResult.errors).toContain("Room capacity (24) is smaller than section headcount (35)");

      // Online mode with same section headcount: passes without physical room constraints
      const onlineResult = validateClassSchedule({
        modality: "Online",
        room: "Virtual Room",
        roomCapacity: 0,
        sectionHeadcount: 35,
        teacherId: "FAC-1",
        teacherIsBooked: false,
      });
      expect(onlineResult.valid).toBe(true);
      expect(onlineResult.errors.length).toBe(0);

      // Online mode still catches teacher double-booking
      const onlineDoubleBooked = validateClassSchedule({
        modality: "Online",
        room: "Virtual Room",
        sectionHeadcount: 35,
        teacherId: "FAC-1",
        teacherIsBooked: true,
      });
      expect(onlineDoubleBooked.valid).toBe(false);
      expect(onlineDoubleBooked.errors).toContain("Faculty double-booking detected");
    });

    it("tracks examination scheduling sequence and proactively identifies next upcoming term", () => {
      const allExams = [
        { id: "e1", term: "Prelim", subjectCode: "GE1", examDate: "2026-10-10" },
        { id: "e2", term: "Prelim", subjectCode: "IT101", examDate: "2026-10-11" },
      ];

      const computeExamPeriodStatus = (examsList: typeof allExams) => {
        const terms = ["Prelim", "Midterm", "Semi-Final", "Final"] as const;
        const termStats = terms.map((term) => {
          const matching = examsList.filter((e) => e.term.toLowerCase() === term.toLowerCase());
          return {
            term,
            isScheduled: matching.length > 0,
            count: matching.length,
          };
        });

        const nextUnscheduled = termStats.find((t) => !t.isScheduled);
        return { termStats, nextUnscheduled };
      };

      const status = computeExamPeriodStatus(allExams);
      expect(status.termStats[0].term).toBe("Prelim");
      expect(status.termStats[0].isScheduled).toBe(true);

      // Midterm is the next required term to be scheduled
      expect(status.nextUnscheduled?.term).toBe("Midterm");
      expect(status.termStats[1].isScheduled).toBe(false);
      expect(status.termStats[2].isScheduled).toBe(false); // Semi-Final
      expect(status.termStats[3].isScheduled).toBe(false); // Final
    });
  });
});



