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

describe("Exam Subject Palette Role-Based Visibility & Filtering", () => {
  const catalogSubjects = [
    // ITP / BSIT Majors
    { code: "IT 101", name: "Computer Programming 1", program: "BSIT", department: "ITP", isMajor: true, units: 3, lectureHours: 2, labHours: 3 },
    { code: "CS 102", name: "Data Structures and Algorithms", program: "BSCS", department: "ITP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
    // BSA Majors
    { code: "ACT 101", name: "Financial Accounting 1", program: "BSA", department: "BAP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
    { code: "BA 201", name: "Principles of Management", program: "BSBA", department: "BAP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
    // BSHM Majors
    { code: "HM 101", name: "Intro to Hospitality Management", program: "BSHM", department: "HMP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
    { code: "THC 102", name: "Tourism and Hospitality Culture", program: "BSHM", department: "HMP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
    // CJEP / Criminology Majors
    { code: "CRIM 101", name: "Introduction to Criminology", program: "BSCRIM", department: "CJEP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
    { code: "LEA 102", name: "Law Enforcement Administration", program: "BSCRIM", department: "CJEP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
    // TEP Majors
    { code: "EDUC 101", name: "Child and Adolescent Learners", program: "BSED", department: "TEP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
    { code: "BEED 102", name: "Teaching in the Elementary Grades", program: "BEED", department: "TEP", isMajor: true, units: 3, lectureHours: 3, labHours: 0 },
    // General Education / Minor Subjects (Universal)
    { code: "GE 1", name: "Understanding the Self", program: "ALL", department: "General Education", isMajor: false, units: 3, lectureHours: 3, labHours: 0 },
    { code: "GE 2", name: "Readings in Philippine History", program: "ALL", department: "General Education", isMajor: false, units: 3, lectureHours: 3, labHours: 0 },
    { code: "PE 1", name: "Physical Fitness and Wellness", program: "ALL", department: "General Education", isMajor: false, units: 2, lectureHours: 2, labHours: 0 },
    { code: "NSTP 1", name: "National Service Training Program 1", program: "ALL", department: "General Education", isMajor: false, units: 3, lectureHours: 3, labHours: 0 },
  ];

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
        const isPH = role === "program_head";
        return Promise.resolve({
          data: {
            data: {
              role,
              hasExamSchedulePrivilege: isPH,
              grantedPrivileges: isPH ? ["MANAGE_EXAM_SCHEDULE", "MANAGE_CLASS_SCHEDULE"] : [],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. ADMIN / DSA: Renders full subject palette with all programs and General Education subjects", async () => {
    localStorage.setItem("userRole", "admin");
    localStorage.setItem("selectedProgram", "ALL");

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
      expect(screen.getByText("Exam Subject Palette")).toBeInTheDocument();
    });

    // Admin sees majors across multiple programs
    expect(screen.getByText("IT 101")).toBeInTheDocument();
    expect(screen.getByText("ACT 101")).toBeInTheDocument();
    expect(screen.getByText("HM 101")).toBeInTheDocument();
    expect(screen.getByText("CRIM 101")).toBeInTheDocument();
    expect(screen.getByText("EDUC 101")).toBeInTheDocument();

    // Admin also sees General Education / Minor subjects
    expect(screen.getByText("GE 1")).toBeInTheDocument();
    expect(screen.getByText("PE 1")).toBeInTheDocument();
    expect(screen.getByText("NSTP 1")).toBeInTheDocument();

    // Classification filter pills are present
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Majors" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Minor / Gen Ed" })).toBeInTheDocument();
  });

  it("2. PROGRAM HEAD (ITP): Shows ONLY ITP/BSIT major subjects, omitting other programs and GenEd/Minors", async () => {
    localStorage.setItem("userRole", "program_head");
    localStorage.setItem("userProgram", "ITP");
    localStorage.setItem("selectedProgram", "ITP");

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
      expect(screen.getByText("Exam Subject Palette")).toBeInTheDocument();
    });

    // ITP Majors ARE shown
    expect(screen.getByText("IT 101")).toBeInTheDocument();
    expect(screen.getByText("CS 102")).toBeInTheDocument();

    // Other program majors MUST NOT be shown
    expect(screen.queryByText("ACT 101")).not.toBeInTheDocument();
    expect(screen.queryByText("BA 201")).not.toBeInTheDocument();
    expect(screen.queryByText("HM 101")).not.toBeInTheDocument();
    expect(screen.queryByText("CRIM 101")).not.toBeInTheDocument();
    expect(screen.queryByText("EDUC 101")).not.toBeInTheDocument();

    // GenEd / Minor subjects MUST NOT be shown
    expect(screen.queryByText("GE 1")).not.toBeInTheDocument();
    expect(screen.queryByText("GE 2")).not.toBeInTheDocument();
    expect(screen.queryByText("PE 1")).not.toBeInTheDocument();
    expect(screen.queryByText("NSTP 1")).not.toBeInTheDocument();
  });

  it("3. PROGRAM HEAD (BSA): Shows ONLY BSA major subjects", async () => {
    localStorage.setItem("userRole", "program_head");
    localStorage.setItem("userProgram", "BSA");
    localStorage.setItem("selectedProgram", "BSA");

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
      expect(screen.getByText("Exam Subject Palette")).toBeInTheDocument();
    });

    // BSA Majors ARE shown
    expect(screen.getByText("ACT 101")).toBeInTheDocument();
    expect(screen.getByText("BA 201")).toBeInTheDocument();

    // Other majors and GenEd MUST NOT be shown
    expect(screen.queryByText("IT 101")).not.toBeInTheDocument();
    expect(screen.queryByText("HM 101")).not.toBeInTheDocument();
    expect(screen.queryByText("CRIM 101")).not.toBeInTheDocument();
    expect(screen.queryByText("EDUC 101")).not.toBeInTheDocument();
    expect(screen.queryByText("GE 1")).not.toBeInTheDocument();
    expect(screen.queryByText("PE 1")).not.toBeInTheDocument();
  });

  it("4. PROGRAM HEAD (BSHM): Shows ONLY BSHM major subjects", async () => {
    localStorage.setItem("userRole", "program_head");
    localStorage.setItem("userProgram", "BSHM");
    localStorage.setItem("selectedProgram", "BSHM");

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
      expect(screen.getByText("Exam Subject Palette")).toBeInTheDocument();
    });

    // BSHM Majors ARE shown
    expect(screen.getByText("HM 101")).toBeInTheDocument();
    expect(screen.getByText("THC 102")).toBeInTheDocument();

    // Other majors and GenEd MUST NOT be shown
    expect(screen.queryByText("IT 101")).not.toBeInTheDocument();
    expect(screen.queryByText("ACT 101")).not.toBeInTheDocument();
    expect(screen.queryByText("CRIM 101")).not.toBeInTheDocument();
    expect(screen.queryByText("GE 1")).not.toBeInTheDocument();
  });

  it("5. PROGRAM HEAD (CJEP/Criminology): Shows ONLY Criminology major subjects", async () => {
    localStorage.setItem("userRole", "program_head");
    localStorage.setItem("userProgram", "CJEP");
    localStorage.setItem("selectedProgram", "CJEP");

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
      expect(screen.getByText("Exam Subject Palette")).toBeInTheDocument();
    });

    // CJEP Majors ARE shown
    expect(screen.getByText("CRIM 101")).toBeInTheDocument();
    expect(screen.getByText("LEA 102")).toBeInTheDocument();

    // Other majors and GenEd MUST NOT be shown
    expect(screen.queryByText("IT 101")).not.toBeInTheDocument();
    expect(screen.queryByText("ACT 101")).not.toBeInTheDocument();
    expect(screen.queryByText("HM 101")).not.toBeInTheDocument();
    expect(screen.queryByText("GE 1")).not.toBeInTheDocument();
  });

  it("6. PROGRAM HEAD (TEP): Shows ONLY TEP major subjects", async () => {
    localStorage.setItem("userRole", "program_head");
    localStorage.setItem("userProgram", "TEP");
    localStorage.setItem("selectedProgram", "TEP");

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
      expect(screen.getByText("Exam Subject Palette")).toBeInTheDocument();
    });

    // TEP Majors ARE shown
    expect(screen.getByText("EDUC 101")).toBeInTheDocument();
    expect(screen.getByText("BEED 102")).toBeInTheDocument();

    // Other majors and GenEd MUST NOT be shown
    expect(screen.queryByText("IT 101")).not.toBeInTheDocument();
    expect(screen.queryByText("ACT 101")).not.toBeInTheDocument();
    expect(screen.queryByText("CRIM 101")).not.toBeInTheDocument();
    expect(screen.queryByText("GE 1")).not.toBeInTheDocument();
  });
});
