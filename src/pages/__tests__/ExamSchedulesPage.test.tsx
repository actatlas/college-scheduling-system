import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
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

describe("ExamSchedulesPage", () => {
  beforeEach(() => {
    mockGet.mockReset();
    localStorage.clear();
    localStorage.setItem("userRole", "admin");
    mockGet.mockImplementation((url: string) => {
      if (url === "/exams") {
        return Promise.resolve({ data: { data: sampleExams } });
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
      return Promise.resolve({ data: { data: [] } });
    });
  });

  afterEach(() => {
    cleanup();
  });

  const sampleExams = [
    {
      id: "1",
      term: "Midterm",
      examDate: "2026-10-15",
      time: "08:00-10:00",
      startTime: "08:00:00",
      endTime: "10:00:00",
      subjectCode: "GE 1",
      subject: "UNDERSTANDING THE SELF",
      synchronizedSections: ["BSIT 2-A", "BSCrim 1-A"],
      room: "LAB-02",
      building: "Science Block",
      proctor: "Maria Santos",
      proctorId: "T001",
      program: "ITP",
      color: "#0284c7",
    },
  ];

  it("renders the examination calendar timetable grid with time slots, days, and navigation", async () => {
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
      expect(screen.getByText("Institutional Examination Schedules")).toBeInTheDocument();
      expect(screen.getAllByText(/Weekly Examination Calendar/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText("08:00-10:00").length).toBeGreaterThan(0);
      expect(screen.getAllByText("GE 1").length).toBeGreaterThan(0);
    });
  });

  it("switches to grouped subject view and shows multi-room assignments", async () => {
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
      expect(screen.getAllByText(/By Subject/i).length).toBeGreaterThan(0);
    });

    const bySubjectBtn = screen.getAllByText(/By Subject/i)[0];
    fireEvent.click(bySubjectBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Active Examination Subjects/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText("UNDERSTANDING THE SELF").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Maria Santos").length).toBeGreaterThan(0);
    });
  });

  it("provides the Use Previous Schedule template copy action", async () => {
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
      expect(screen.getAllByText(/Use Previous Schedule/i).length).toBeGreaterThan(0);
    });
  });

  it("allows Admin to configure official examination dates via modal", async () => {
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
      expect(screen.getAllByText(/Official Exam Dates/i).length).toBeGreaterThan(0);
    });

    const officialBtn = screen.getAllByText(/Official Exam Dates/i)[0];
    fireEvent.click(officialBtn);

    await waitFor(() => {
      expect(screen.getByText("Official Examination Period Settings")).toBeInTheDocument();
      expect(screen.getByLabelText(/Prelim Official Exam Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Midterm Official Exam Date/i)).toBeInTheDocument();
    });
  });

  it("restricts Program Head from configuring official examination dates", async () => {
    localStorage.setItem("userRole", "program_head");

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
      expect(screen.getByText("Academic Program Examination Schedules")).toBeInTheDocument();
      expect(screen.queryByTitle(/Configure official examination dates/i)).not.toBeInTheDocument();
      expect(screen.queryByText("Official Exam Dates")).not.toBeInTheDocument();
    });
  });
});
