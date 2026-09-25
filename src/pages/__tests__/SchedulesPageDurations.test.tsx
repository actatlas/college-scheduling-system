import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { SchedulesPage } from "../SchedulesPage";
import { ProgramProvider } from "../../contexts/ProgramContext";
import { NotificationProvider } from "../../contexts/NotificationContext";
import { ToastProvider } from "../../components/common/Toast";
import { api } from "../../data/apiClient";

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

describe("SchedulesPage Institutional Class Durations", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.setItem("userRole", "admin");
    window.localStorage.setItem("userName", "Admin User");
    window.localStorage.setItem("userProgram", "BSIT");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "sched-minor",
                day: "Monday",
                time: "07:00 AM - 08:30 AM",
                subjectCode: "GE101",
                subject: "Understanding the Self",
                section: "BSIT 1-A",
                faculty: "Prof. Ada Lovelace",
                facultyId: "FAC-001",
                room: "COL-101",
                building: "College Building",
                modality: "Face-to-Face",
                program: "ALL",
                isMajor: false,
                classMode: "Lecture",
              },
              {
                id: "sched-major-lec",
                day: "Monday",
                time: "08:30 AM - 10:30 AM",
                subjectCode: "IT101",
                subject: "Computer Programming 1",
                section: "BSIT 1-A",
                faculty: "Prof. Ada Lovelace",
                facultyId: "FAC-001",
                room: "COL-101",
                building: "College Building",
                modality: "Face-to-Face",
                program: "BSIT",
                isMajor: true,
                classMode: "Lecture",
              },
              {
                id: "sched-major-lab",
                day: "Tuesday",
                time: "07:30 AM - 10:30 AM",
                subjectCode: "IT102",
                subject: "Data Structures Lab",
                section: "BSIT 1-A",
                faculty: "Dr. Alan Turing",
                facultyId: "FAC-002",
                room: "LAB-201",
                building: "College Building",
                modality: "Face-to-Face",
                program: "BSIT",
                isMajor: true,
                classMode: "Laboratory",
              },
            ],
          },
        });
      }
      if (url === "/faculty") {
        return Promise.resolve({
          data: {
            data: [
              { id: "FAC-001", name: "Prof. Ada Lovelace", department: "ITP" },
              { id: "FAC-002", name: "Dr. Alan Turing", department: "ITP" },
            ],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              { code: "GE101", name: "Understanding the Self", program: "ALL", isMajor: false },
              { code: "IT101", name: "Computer Programming 1", program: "BSIT", isMajor: true },
              { code: "IT102", name: "Data Structures Lab", program: "BSIT", isMajor: true, labHours: 3 },
            ],
          },
        });
      }
      if (url === "/rooms") {
        return Promise.resolve({
          data: {
            data: [
              { number: "COL-101", building: "College Building" },
              { number: "LAB-201", building: "College Building" },
            ],
          },
        });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [{ section: "1-A", course: "BSIT", program: "BSIT" }],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("displays institutional duration legend and badges for minor (1.5h), major lec (2h), and major lab (3h)", async () => {
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

    // 1. Institutional duration banner is visible
    const legendBanner = await screen.findByRole("region", { name: /Institutional Class Duration Guidelines/i });
    expect(legendBanner).toBeInTheDocument();
    expect(legendBanner).toHaveTextContent("1 hr 30 mins (1.5h)");
    expect(legendBanner).toHaveTextContent("Major Lecture");
    expect(legendBanner).toHaveTextContent("Major Lab");
    expect(legendBanner).toHaveTextContent("Starts at 7:00 AM or 7:30 AM");

    // 2. Corner header shows "Class Time", not "Time (30m)"
    expect(screen.getByText("Class Time")).toBeInTheDocument();
    expect(screen.queryByText("Time (30m)")).not.toBeInTheDocument();

    // 3. Time gutter does NOT display misleading "to 07:30 AM" or 30-minute isolated intervals
    expect(screen.queryByText("to 07:30 AM")).not.toBeInTheDocument();
    expect(screen.queryByText("to 08:00 AM")).not.toBeInTheDocument();

    // 4. Time gutter displays clean hour markers and shift indicators
    const hourMarkers = screen.getAllByText("Hour Mark");
    expect(hourMarkers.length).toBeGreaterThan(0);
    const shiftMarkers = screen.getAllByText(":30 Shift");
    expect(shiftMarkers.length).toBeGreaterThan(0);

    // 5. Subject durations are clearly indicated in the institutional guidelines
    expect(await screen.findByText(/Minor: 1 hr 30 mins \(1.5h\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Major Lecture \(2h\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Major Lab \(3h\)/i)).toBeInTheDocument();
  });

  it("does not render Delivery Mode or Virtual Link when adding a schedule", async () => {
    const { fireEvent } = await import("@testing-library/react");

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

    const addScheduleBtn = await screen.findByRole("button", { name: /Schedule Class/i });
    fireEvent.click(addScheduleBtn);

    // Modal is opened
    expect(await screen.findByText(/Create Class Schedule - Step 1/i)).toBeInTheDocument();

    // Delivery Mode / Face-to-Face vs Online toggle is NOT present in the modal
    expect(screen.queryByText(/Delivery Mode/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Face-to-Face/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Online/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/https:\/\/meet\.google\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Virtual Meeting Link/i)).not.toBeInTheDocument();
  });

  it("does not render Face-to-Face pill on schedule cards", async () => {
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

    // Institutional guidelines banner is present
    expect(await screen.findByText(/Minor: 1 hr 30 mins \(1.5h\)/i)).toBeInTheDocument();

    // Verify "Face-to-Face" is not rendered as a badge on the cards
    const facePills = screen.queryAllByText("Face-to-Face");
    expect(facePills.length).toBe(0);
  });

  it("auto-allocates paired day with complementary Lecture/Laboratory for major subjects", async () => {
    const { fireEvent } = await import("@testing-library/react");

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

    const addScheduleBtn = await screen.findByRole("button", { name: /Schedule Class/i });
    fireEvent.click(addScheduleBtn);

    expect(await screen.findByText(/Create Class Schedule - Step 1/i)).toBeInTheDocument();

    // Select major subject IT101 from SearchableSelect dropdown
    const subjectTrigger = screen.getByRole("button", { name: /GE101 - Understanding the Self/i });
    fireEvent.click(subjectTrigger);

    const majorOption = await screen.findByRole("option", { name: /IT101 - Computer Programming 1/i });
    fireEvent.click(majorOption);

    // Verify paired complementary banner is present (Monday auto-pairs with Thursday)
    expect(await screen.findByText(/Monday: Lecture \(2h\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Monday: Lab \(3h\)/i)).toBeInTheDocument();

    // Verify Thursday is auto-assigned as Laboratory (3 hrs)
    expect(screen.getByText(/Thursday auto-assigned as/i)).toBeInTheDocument();
    expect(screen.getByText(/Laboratory \(3 hrs\)/i)).toBeInTheDocument();
  });
});

