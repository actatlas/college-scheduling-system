import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ExamSchedulesPage } from "../ExamSchedulesPage";
import { ToastProvider } from "../../components/common/Toast";
import { ProgramProvider } from "../../contexts/ProgramContext";
import { AcademicPeriodProvider } from "../../contexts/AcademicPeriodContext";

const mockGet = vi.fn();

vi.mock("../../data/apiClient", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn().mockResolvedValue({ data: { data: {} } }),
    put: vi.fn().mockResolvedValue({ data: { data: {} } }),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

describe("Program Head Delegated Access & Exam Permission Enforcement (/exam-schedules)", () => {
  const catalogSubjects = [
    { code: "IT 101", name: "Computer Programming 1", program: "BSIT", department: "ITP", isMajor: true, units: 3, lectureHours: 2, labHours: 3 },
    { code: "BA 101", name: "Principles of Management", program: "BSBA", department: "BAP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
  ];

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockGet.mockReset();
    localStorage.clear();
    mockGet.mockImplementation((url: string) => {
      if (url === "/exams") {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === "/exams/period-settings") {
        return Promise.resolve({
          data: {
            data: {
              Prelim: "2026-08-19",
              Midterm: "2026-10-15",
              "Semi-Final": "2026-12-10",
              Final: "2027-03-05",
            },
          },
        });
      }
      if (url === "/terms/settings") {
        return Promise.resolve({
          data: {
            data: {
              academicYear: "2026-2027",
              semester: "1st Semester",
            },
          },
        });
      }
      if (url.startsWith("/subjects")) {
        return Promise.resolve({ data: { data: catalogSubjects } });
      }
      if (url === "/delegations/my-privileges") {
        const role = localStorage.getItem("userRole");
        const prog = localStorage.getItem("userProgram") || localStorage.getItem("selectedProgram");
        const hasExam = prog === "ITP" || prog === "BSIT";
        return Promise.resolve({
          data: {
            data: {
              role,
              hasExamSchedulePrivilege: hasExam,
              grantedPrivileges: hasExam ? ["MANAGE_EXAM_SCHEDULE", "MANAGE_CLASS_SCHEDULE"] : ["MANAGE_CLASS_SCHEDULE"],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("1. PROGRAM HEAD WITH PRIVILEGE (BSIT): Unlocks Subject Palette and displays discreet Marian blue banner", async () => {
    localStorage.setItem("userRole", "program_head");
    localStorage.setItem("userProgram", "ITP");
    localStorage.setItem("selectedProgram", "ITP");
    localStorage.setItem("userName", "Dr. Alan Turing");

    render(
      <BrowserRouter>
        <AcademicPeriodProvider>
          <ProgramProvider>
            <ToastProvider>
              <ExamSchedulesPage />
            </ToastProvider>
          </ProgramProvider>
        </AcademicPeriodProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Delegated Access: Authorized to manage/i)).toBeInTheDocument();
    });

    // Marian blue banner contains program notice
    expect(screen.getByText(/Delegated Access: Authorized to manage ITP exam schedules/i)).toBeInTheDocument();

    // Subject palette is unlocked and visible
    expect(screen.getByText("Exam Subject Palette")).toBeInTheDocument();
    expect(screen.getByText("IT 101")).toBeInTheDocument();

    // Schedule Exam action button is present
    expect(screen.getByRole("button", { name: /Schedule Exam/i })).toBeInTheDocument();
  });

  it("2. PROGRAM HEAD WITHOUT PRIVILEGE (BSBA): Locks editing, displays status notice, hides Subject Palette", async () => {
    localStorage.setItem("userRole", "program_head");
    localStorage.setItem("userProgram", "BAP");
    localStorage.setItem("selectedProgram", "BAP");
    localStorage.setItem("userName", "Dr. Peter Drucker");

    render(
      <BrowserRouter>
        <AcademicPeriodProvider>
          <ProgramProvider>
            <ToastProvider>
              <ExamSchedulesPage />
            </ToastProvider>
          </ProgramProvider>
        </AcademicPeriodProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Read-Only Exam Timetable View")).toBeInTheDocument();
    });

    // Locked notice mentions contacting DSA
    expect(screen.getByText(/Exam schedule editing requires Admin authorization. Contact the Dean of Student Affairs./i)).toBeInTheDocument();

    // Subject palette is locked / hidden
    expect(screen.queryByText("Exam Subject Palette")).not.toBeInTheDocument();

    // Schedule action buttons are hidden
    expect(screen.queryByRole("button", { name: /Schedule Exam/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use Previous Schedule/i })).not.toBeInTheDocument();
  });
});
