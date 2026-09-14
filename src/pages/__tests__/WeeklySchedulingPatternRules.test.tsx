import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { SchedulesPage } from "../SchedulesPage";
import { ProgramProvider } from "../../contexts/ProgramContext";
import { NotificationProvider } from "../../contexts/NotificationContext";
import { ToastProvider } from "../../components/common/Toast";
import { api } from "../../data/apiClient";
import {
  getPairedDay,
  getDayPairLabel,
  getExpectedSubjectDuration,
  calculateEndTimeFromStart,
  isGeneralSubject,
  DAY_PAIRS,
} from "../../utils/scheduling";

// @vitest-environment jsdom

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("School Weekly Scheduling Pattern Rules", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    window.localStorage.setItem("userRole", "admin");
    window.localStorage.setItem("userName", "Admin Officer");
    window.localStorage.setItem("userProgram", "BSIT");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({
          data: {
            data: [],
          },
        });
      }
      if (url === "/faculty") {
        return Promise.resolve({
          data: {
            data: [
              { id: "FAC-001", name: "Prof. Ada Lovelace", department: "ITP", status: "Full-Time" },
              { id: "FAC-PT1", name: "Dr. Saturday PartTimer", department: "ITP", status: "Part-Time", availability: "Saturday: 08:00 AM - 12:00 PM" },
            ],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              { code: "GE1", name: "Purposive Communication", program: "ALL", isMajor: false, lectureHours: 1.5 },
              { code: "IT101", name: "Advanced Programming", program: "BSIT", isMajor: true, lectureHours: 2, labHours: 3 },
            ],
          },
        });
      }
      if (url === "/rooms") {
        return Promise.resolve({
          data: {
            data: [
              { number: "COL-101", building: "College Building", type: "Lecture", capacity: 45 },
              { number: "LAB-201", building: "College Building", type: "Laboratory", capacity: 40 },
            ],
          },
        });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [{ section: "1-A", course: "BSIT", program: "BSIT", students: 30 }],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  });

  describe("1. Day Pairing Definition & Standalone Days", () => {
    it("pairs Monday <-> Thursday", () => {
      expect(getPairedDay("Monday")).toBe("Thursday");
      expect(getPairedDay("Thursday")).toBe("Monday");
      expect(getDayPairLabel("Monday")).toBe("Monday & Thursday (M-Th)");
      expect(getDayPairLabel("Thursday")).toBe("Thursday & Monday (Th-M)");
    });

    it("pairs Tuesday <-> Friday", () => {
      expect(getPairedDay("Tuesday")).toBe("Friday");
      expect(getPairedDay("Friday")).toBe("Tuesday");
      expect(getDayPairLabel("Tuesday")).toBe("Tuesday & Friday (T-F)");
      expect(getDayPairLabel("Friday")).toBe("Friday & Tuesday (F-T)");
    });

    it("does NOT pair Wednesday (standalone school activities / online class)", () => {
      expect(getPairedDay("Wednesday")).toBeNull();
      expect(getDayPairLabel("Wednesday")).toBe("Wednesday");
      expect(DAY_PAIRS["Wednesday"]).toBeUndefined();
    });

    it("does NOT pair Saturday (standalone part-time teacher classes)", () => {
      expect(getPairedDay("Saturday")).toBeNull();
      expect(getDayPairLabel("Saturday")).toBe("Saturday");
      expect(DAY_PAIRS["Saturday"]).toBeUndefined();
    });
  });

  describe("2. Required Test Scenarios (All 8 Rules)", () => {
    const geSubject = { code: "GE1", name: "Purposive Communication", isMajor: false, lectureHours: 1.5 };
    const majorSubject = { code: "IT101", name: "Advanced Programming", isMajor: true, lectureHours: 2, labHours: 3 };

    // Test 1: GE1 Monday -> Thursday (1.5h each)
    it("Scenario 1: GE1 Monday -> Thursday (1.5 hrs per session)", () => {
      expect(isGeneralSubject(geSubject)).toBe(true);
      const day1 = "Monday";
      const pairedDay = getPairedDay(day1);
      expect(pairedDay).toBe("Thursday");

      const duration = getExpectedSubjectDuration(geSubject, "Lecture");
      expect(duration).toBe(90); // 1.5 hours
      const startTime = "07:30 AM";
      const endTime = calculateEndTimeFromStart(startTime, duration);
      expect(endTime).toBe("09:00 AM"); // 1.5h
    });

    // Test 2: GE1 Tuesday -> Friday (1.5h each)
    it("Scenario 2: GE1 Tuesday -> Friday (1.5 hrs per session)", () => {
      const day1 = "Tuesday";
      const pairedDay = getPairedDay(day1);
      expect(pairedDay).toBe("Friday");

      const duration = getExpectedSubjectDuration(geSubject, "Lecture");
      expect(duration).toBe(90); // 1.5 hours
      const startTime = "09:00 AM";
      const endTime = calculateEndTimeFromStart(startTime, duration);
      expect(endTime).toBe("10:30 AM"); // 1.5h
    });

    // Test 3: Major: Monday Lecture 2 hrs -> Thursday Lab 3 hrs
    it("Scenario 3: Major: Monday Lecture 2 hrs -> Thursday Lab 3 hrs", () => {
      const day1 = "Monday";
      const day1Mode = "Lecture";
      const pairedDay = getPairedDay(day1);
      expect(pairedDay).toBe("Thursday");

      const day1Duration = getExpectedSubjectDuration(majorSubject, day1Mode);
      expect(day1Duration).toBe(120); // 2 hours
      const day1End = calculateEndTimeFromStart("07:00 AM", day1Duration);
      expect(day1End).toBe("09:00 AM");

      const day2Mode = day1Mode === "Lecture" ? "Laboratory" : "Lecture";
      expect(day2Mode).toBe("Laboratory");
      const day2Duration = getExpectedSubjectDuration(majorSubject, day2Mode);
      expect(day2Duration).toBe(180); // 3 hours
      const day2End = calculateEndTimeFromStart("07:00 AM", day2Duration);
      expect(day2End).toBe("10:00 AM");
    });

    // Test 4: Major: Monday Lab 3 hrs -> Thursday Lecture 2 hrs
    it("Scenario 4: Major: Monday Lab 3 hrs -> Thursday Lecture 2 hrs", () => {
      const day1 = "Monday";
      const day1Mode: "Lecture" | "Laboratory" = "Laboratory";
      const pairedDay = getPairedDay(day1);
      expect(pairedDay).toBe("Thursday");

      const day1Duration = getExpectedSubjectDuration(majorSubject, day1Mode);
      expect(day1Duration).toBe(180); // 3 hours
      const day1End = calculateEndTimeFromStart("07:00 AM", day1Duration);
      expect(day1End).toBe("10:00 AM");

      const day2Mode = "Lecture";
      expect(day2Mode).toBe("Lecture");
      const day2Duration = getExpectedSubjectDuration(majorSubject, day2Mode);
      expect(day2Duration).toBe(120); // 2 hours
      const day2End = calculateEndTimeFromStart("07:00 AM", day2Duration);
      expect(day2End).toBe("09:00 AM");
    });

    // Test 5: Major: Tuesday Lecture 2 hrs -> Friday Lab 3 hrs
    it("Scenario 5: Major: Tuesday Lecture 2 hrs -> Friday Lab 3 hrs", () => {
      const day1 = "Tuesday";
      const day1Mode = "Lecture";
      const pairedDay = getPairedDay(day1);
      expect(pairedDay).toBe("Friday");

      const day1Duration = getExpectedSubjectDuration(majorSubject, day1Mode);
      expect(day1Duration).toBe(120); // 2 hours
      const day1End = calculateEndTimeFromStart("01:00 PM", day1Duration);
      expect(day1End).toBe("03:00 PM");

      const day2Mode = "Laboratory";
      const day2Duration = getExpectedSubjectDuration(majorSubject, day2Mode);
      expect(day2Duration).toBe(180); // 3 hours
      const day2End = calculateEndTimeFromStart("01:00 PM", day2Duration);
      expect(day2End).toBe("04:00 PM");
    });

    // Test 6: Major: Tuesday Lab 3 hrs -> Friday Lecture 2 hrs
    it("Scenario 6: Major: Tuesday Lab 3 hrs -> Friday Lecture 2 hrs", () => {
      const day1 = "Tuesday";
      const day1Mode = "Laboratory";
      const pairedDay = getPairedDay(day1);
      expect(pairedDay).toBe("Friday");

      const day1Duration = getExpectedSubjectDuration(majorSubject, day1Mode);
      expect(day1Duration).toBe(180); // 3 hours
      const day1End = calculateEndTimeFromStart("01:00 PM", day1Duration);
      expect(day1End).toBe("04:00 PM");

      const day2Mode = "Lecture";
      const day2Duration = getExpectedSubjectDuration(majorSubject, day2Mode);
      expect(day2Duration).toBe(120); // 2 hours
      const day2End = calculateEndTimeFromStart("01:00 PM", day2Duration);
      expect(day2End).toBe("03:00 PM");
    });

    // Test 7: Wednesday online class (standalone, no paired class created)
    it("Scenario 7: Wednesday online class is standalone without paired day", () => {
      const day = "Wednesday";
      const pairedDay = getPairedDay(day);
      expect(pairedDay).toBeNull();
    });

    // Test 8: Saturday part-time class (standalone, no paired class created)
    it("Scenario 8: Saturday part-time teacher class is standalone without paired day", () => {
      const day = "Saturday";
      const pairedDay = getPairedDay(day);
      expect(pairedDay).toBeNull();
    });
  });

  describe("3. UI Flow in SchedulesPage Modal", () => {
    it("correctly auto-allocates paired day with complementary Lecture/Laboratory for major subjects", async () => {
      render(
        <BrowserRouter>
          <ToastProvider>
            <NotificationProvider>
              <ProgramProvider>
                <SchedulesPage />
              </ProgramProvider>
            </NotificationProvider>
          </ToastProvider>
        </BrowserRouter>
      );

      const addBtn = await screen.findByRole("button", { name: /Schedule Class/i });
      fireEvent.click(addBtn);

      // Verify modal is open at Step 1
      expect(await screen.findByText(/Create Class Schedule - Step 1/i)).toBeInTheDocument();

      // Select major subject IT101 from SearchableSelect dropdown
      const subjectTrigger = screen.getByRole("button", { name: /GE1 - Purposive Communication/i });
      fireEvent.click(subjectTrigger);

      const majorOption = await screen.findByRole("option", { name: /IT101 - Advanced Programming/i });
      fireEvent.click(majorOption);

      // Verify Day 1 is Monday and auto-pairs with Thursday
      expect(await screen.findByText(/Auto-pairs with Thursday/i)).toBeInTheDocument();
      expect(screen.getByText(/Monday: Lecture \(2h\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Monday: Lab \(3h\)/i)).toBeInTheDocument();

      // Verify Thursday is auto-assigned as Laboratory (3 hrs)
      expect(screen.getByText(/Thursday auto-assigned as/i)).toBeInTheDocument();
      expect(screen.getByText(/Laboratory \(3 hrs\)/i)).toBeInTheDocument();
    }, 15000);
  });
});
