import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { DashboardPage } from "../DashboardPage";
import { ProgramProvider } from "../../contexts/ProgramContext";
import { NotificationProvider } from "../../contexts/NotificationContext";
import { ToastProvider } from "../../components/common/Toast";
import { api } from "../../data/apiClient";

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("Program Head Dashboard Additions & Categories", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.setItem("userRole", "program_head");
    window.localStorage.setItem("userName", "Dr. Reyes");
    window.localStorage.setItem("userProgram", "BSIT");
    window.localStorage.setItem("teacherId", "FAC-003");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/faculty") {
        return Promise.resolve({
          data: {
            data: [
              { id: "FAC-003", name: "Dr. Reyes", title: "Program Head / Assoc. Professor", department: "ITP", units: 12, maxUnits: 15 },
              { id: "FAC-001", name: "Prof. Lovelace", title: "Instructor", department: "ITP", units: 15, maxUnits: 15 },
            ],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              { code: "IT101", name: "Intro to Computing", program: "ITP", yearLevel: 1 },
              { code: "IT201", name: "Data Structures", program: "ITP", yearLevel: 2 },
              { code: "IT301", name: "Web Systems and Tech", program: "ITP", yearLevel: 3 },
              { code: "IT401", name: "Capstone 1", program: "ITP", yearLevel: 4 },
            ],
          },
        });
      }
      if (url === "/schedules") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "s1",
                subjectCode: "IT101",
                subject: "Intro to Computing",
                section: "BSIT 1-A",
                yearLevel: "1st Year",
                day: "Monday",
                time: "08:00 AM - 09:30 AM",
                faculty: "Prof. Lovelace",
                facultyId: "FAC-001",
                room: "COMLAB-1",
                building: "College Building",
                modality: "Face-to-Face",
                program: "ITP",
              },
              {
                id: "s2",
                subjectCode: "IT201",
                subject: "Data Structures",
                section: "BSIT 2-A",
                yearLevel: "2nd Year",
                day: "Tuesday",
                time: "10:00 AM - 11:30 AM",
                faculty: "Prof. Lovelace",
                facultyId: "FAC-001",
                room: "COMLAB-2",
                building: "College Building",
                modality: "Face-to-Face",
                program: "ITP",
              },
              {
                id: "s3",
                subjectCode: "IT301",
                subject: "Web Systems and Tech",
                section: "BSIT 3-A",
                yearLevel: "3rd Year",
                day: "Wednesday",
                time: "01:00 PM - 02:30 PM",
                faculty: "Dr. Reyes",
                facultyId: "FAC-003",
                room: "COMLAB-1",
                building: "College Building",
                modality: "Face-to-Face",
                program: "ITP",
              },
            ],
          },
        });
      }
      if (url === "/rooms") {
        return Promise.resolve({ data: { data: [{ number: "COMLAB-1", building: "College Building" }] } });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, name: "BSIT 1-A", course_code: "BSIT", year_level: 1 },
              { id: 2, name: "BSIT 2-A", course_code: "BSIT", year_level: 2 },
              { id: 3, name: "BSIT 3-A", course_code: "BSIT", year_level: 3 },
            ],
          },
        });
      }
      if (url === "/conflicts") return Promise.resolve({ data: { data: [] } });
      if (url === "/exams") return Promise.resolve({ data: { data: [] } });
      if (url === "/notifications") return Promise.resolve({ data: { data: [] } });

      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("renders My Teaching Schedule separately from Program Management", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <ProgramProvider>
            <NotificationProvider>
              <DashboardPage />
            </NotificationProvider>
          </ProgramProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("My Teaching Schedule")).toBeInTheDocument();
    });

    // Check personal instructor subtitle
    expect(
      screen.getByText(/Personal instructor timetable • Classes directly assigned to Dr. Reyes as course instructor/)
    ).toBeInTheDocument();
  });

  it("renders Today's Schedule daily operations and opens schedule details modal", async () => {
    const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/faculty") {
        return Promise.resolve({
          data: {
            data: [
              { id: "FAC-003", name: "Dr. Reyes", title: "Program Head / Assoc. Professor", department: "ITP", units: 12, maxUnits: 15 },
            ],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              { code: "IT101", name: "Intro to Computing", program: "ITP", yearLevel: 1 },
            ],
          },
        });
      }
      if (url === "/schedules") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "s1",
                subjectCode: "IT101",
                subject: "Intro to Computing",
                section: "BSIT 1-A",
                yearLevel: "1st Year",
                day: todayName,
                time: "08:00 AM - 09:30 AM",
                faculty: "Prof. Lovelace",
                facultyId: "FAC-001",
                room: "COMLAB-1",
                building: "College Building",
                modality: "Face-to-Face",
                program: "ITP",
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <ProgramProvider>
            <NotificationProvider>
              <DashboardPage />
            </NotificationProvider>
          </ProgramProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Wait for initial data load
    expect(await screen.findByText("Intro to Computing")).toBeInTheDocument();
    expect(screen.getByText("IT101")).toBeInTheDocument();
    expect(screen.getByText("Total Classes Today")).toBeInTheDocument();
    expect(screen.getByText("Currently Ongoing")).toBeInTheDocument();
    expect(screen.getByText("Action Required")).toBeInTheDocument();

    // Click on schedule card to open Schedule Details modal
    const scheduleRow = screen.getByText("Intro to Computing").closest(".today-schedule-row");
    expect(scheduleRow).toBeInTheDocument();
    if (scheduleRow) {
      fireEvent.click(scheduleRow);
    }

    await waitFor(() => {
      expect(screen.getByText(/Schedule Details/i)).toBeInTheDocument();
    });
  });
});
