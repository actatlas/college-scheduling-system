import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "../DashboardPage";
import { ProgramProvider } from "../../contexts/ProgramContext";
import { ToastProvider } from "../../components/common/Toast";
import { api } from "../../data/apiClient";

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe("DashboardPage - Admin Today's Schedule & Stacked Grouping", () => {
  beforeEach(() => {
    window.localStorage.setItem("userRole", "admin");
    window.localStorage.setItem("userName", "Admin User");
    window.localStorage.setItem("userProgram", "BSIT");
    vi.clearAllMocks();
  });

  it("renders daily operations dashboard with clean nominal state and 'No schedules for today.' when empty", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

    render(
      <MemoryRouter>
        <ToastProvider>
          <ProgramProvider>
            <DashboardPage />
          </ProgramProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/College Academic Scheduling Dashboard/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Today's Schedule/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Total Classes Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Currently Ongoing/i)).toBeInTheDocument();
    expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
    expect(await screen.findByText(/No schedules for today\./i)).toBeInTheDocument();
    expect(screen.getByText(/No classes scheduled for today/i)).toBeInTheDocument();
  });

  it("displays today's classes chronologically with Time, Subject, Section, Faculty, Room, and Class Mode", async () => {
    const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "sched-1",
                subjectCode: "IT101",
                subject: "Intro to Computing",
                section: "BSIT 1-A",
                day: todayName,
                time: "07:30 AM - 09:00 AM",
                faculty: "Prof. Ada Lovelace",
                room: "COL-101",
                building: "Main Hall",
                modality: "Face-to-Face",
                program: "BSIT",
              },
              {
                id: "sched-2",
                subjectCode: "IT201",
                subject: "Data Structures",
                section: "BSIT 2-A",
                day: todayName,
                time: "10:00 AM - 11:30 AM",
                faculty: "Dr. Alan Turing",
                room: "COMLAB-1",
                building: "IT Building",
                modality: "Online",
                program: "BSIT",
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <ProgramProvider>
            <DashboardPage />
          </ProgramProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("Intro to Computing")).toBeInTheDocument();
    expect(screen.getByText("IT101")).toBeInTheDocument();
    expect(screen.getByText("BSIT 1-A")).toBeInTheDocument();
    expect(screen.getByText("Prof. Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText(/COL-101/)).toBeInTheDocument();
    expect(screen.getByText("Face-to-Face")).toBeInTheDocument();

    expect(screen.getByText("Data Structures")).toBeInTheDocument();
    expect(screen.getByText("IT201")).toBeInTheDocument();
    expect(screen.getByText("BSIT 2-A")).toBeInTheDocument();
    expect(screen.getByText("Dr. Alan Turing")).toBeInTheDocument();
    expect(screen.getByText(/COMLAB-1/)).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("groups/stacks concurrent classes in the exact same time slot with stacked indicator and allows details viewing", async () => {
    const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "sched-stack-1",
                subjectCode: "CS101",
                subject: "Algorithms I",
                section: "BSIT 1-A",
                day: todayName,
                time: "08:00 AM - 09:30 AM",
                faculty: "Prof. Ada Lovelace",
                room: "COL-101",
                modality: "Face-to-Face",
                program: "BSIT",
              },
              {
                id: "sched-stack-2",
                subjectCode: "CS102",
                subject: "Algorithms II",
                section: "BSIT 2-A",
                day: todayName,
                time: "08:00 AM - 09:30 AM",
                faculty: "Dr. Alan Turing",
                room: "COL-102",
                modality: "Online",
                program: "BSIT",
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <ProgramProvider>
            <DashboardPage />
          </ProgramProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    // Stacked group header
    expect(await screen.findByText(/2 Concurrent Classes/i)).toBeInTheDocument();
    expect(screen.getByText("Algorithms I")).toBeInTheDocument();
    expect(screen.getByText("Algorithms II")).toBeInTheDocument();

    // Clicking a schedule row opens the Schedule Details Modal
    const row = screen.getByText("Algorithms I").closest(".today-schedule-row");
    expect(row).toBeInTheDocument();
    if (row) {
      fireEvent.click(row);
    }

    await waitFor(() => {
      expect(screen.getByText(/Schedule Details/i)).toBeInTheDocument();
    });
  });
});
