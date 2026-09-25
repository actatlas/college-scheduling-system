import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { SchedulesPage } from "../SchedulesPage";
import { ScheduleDetailsModal } from "../../components/schedule/ScheduleDetailsModal";
import { ProgramProvider } from "../../contexts/ProgramContext";
import { ToastProvider } from "../../components/common/Toast";
import { NotificationProvider } from "../../contexts/NotificationContext";
import { api } from "../../data/apiClient";

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Schedule Adjustment Request Workflow (Frontend)", () => {
  afterEach(() => {
    cleanup();
  });

  const mockSchedules = [
    {
      id: "1",
      day: "Monday",
      time: "09:00 AM - 10:30 AM",
      startTime: "09:00:00",
      endTime: "10:30:00",
      subjectCode: "GE2",
      subject: "Readings in Philippine History",
      section: "BSIT 1-A",
      sectionId: "1",
      faculty: "Prof. Ada Lovelace",
      facultyId: "T001",
      room: "COL-101",
      building: "College Building",
      roomType: "Lecture",
      classMode: "Lecture",
      yearLevel: "1st Year",
      program: "BSIT",
      modality: "Face-to-Face",
      color: "#2563eb",
      isMajor: false,
    },
  ];

  const mockRooms = [
    { number: "COL-101", capacity: 40, building: "College Building", type: "Lecture", status: "Available" },
    { number: "COL-102", capacity: 40, building: "College Building", type: "Lecture", status: "Available" },
  ];

  const mockSubjects = [
    { code: "GE2", name: "Readings in Philippine History", lectureHours: 1.5, labHours: 0, units: 3, program: "ALL" },
  ];

  const mockFaculty = [
    { id: "T001", name: "Prof. Ada Lovelace", department: "General Education", status: "Full-Time" },
  ];

  const mockSections = [
    { id: "1", course: "BSIT", yearLevel: "1st Year", section: "A", students: 30 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.startsWith("/schedules")) return Promise.resolve({ data: { data: mockSchedules } });
      if (url.startsWith("/rooms")) return Promise.resolve({ data: { data: mockRooms } });
      if (url.startsWith("/subjects")) return Promise.resolve({ data: { data: mockSubjects } });
      if (url.startsWith("/faculty")) return Promise.resolve({ data: { data: mockFaculty } });
      if (url.startsWith("/sections")) return Promise.resolve({ data: { data: mockSections } });
      if (url.startsWith("/schedule-adjustment-requests")) return Promise.resolve({ data: { data: [] } });
      if (url.startsWith("/notifications")) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  const renderComponent = () =>
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

  it("1. PROGRAM HEAD: Clicking schedule card opens Details Modal with 'Request Permission to Move' button", async () => {
    localStorage.setItem("userRole", "program_head");
    localStorage.setItem("userName", "Dr. Alan Turing");
    localStorage.setItem("programCode", "ITP");

    renderComponent();

    // Wait for schedule pill to render and click it to open drawer
    const stackCard = await screen.findByTestId("same-time-stack-card");
    fireEvent.click(stackCard);

    // In drawer, expand details and click Full Details
    const detailsBtn = await screen.findByRole("button", { name: /Details for GE2/i });
    fireEvent.click(detailsBtn);

    const fullDetailsBtn = await screen.findByRole("button", { name: /Full Details/i });
    fireEvent.click(fullDetailsBtn);

    // Verify Details Modal opened
    expect(await screen.findByText("Assigned Class Schedule Details")).toBeInTheDocument();
    const requestBtn = screen.getByRole("button", { name: /Request Permission to Move/i });
    expect(requestBtn).toBeInTheDocument();
  });

  it("2. PROGRAM HEAD: Clicking 'Request Permission to Move' opens Adjustment Request Modal with auto-calculated duration", async () => {
    localStorage.setItem("userRole", "program_head");
    localStorage.setItem("userName", "Dr. Alan Turing");
    localStorage.setItem("programCode", "ITP");

    renderComponent();

    const stackCard = await screen.findByTestId("same-time-stack-card");
    fireEvent.click(stackCard);

    const detailsBtn = await screen.findByRole("button", { name: /Details for GE2/i });
    fireEvent.click(detailsBtn);

    const fullDetailsBtn = await screen.findByRole("button", { name: /Full Details/i });
    fireEvent.click(fullDetailsBtn);

    const requestBtn = await screen.findByRole("button", { name: /Request Permission to Move/i });
    fireEvent.click(requestBtn);

    // Verify Adjustment Request modal is open
    expect(await screen.findByText("Request Schedule Adjustment")).toBeInTheDocument();
    expect(screen.getByText(/Current Timeslot/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/blocking a continuous Major Subject/i)).toBeInTheDocument();

    // Submit Request
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { id: 1, status: "Pending" } } });
    const sendBtn = screen.getByRole("button", { name: /Send Request/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/schedule-adjustment-requests",
        expect.objectContaining({
          scheduleId: 1,
          reason: expect.stringContaining("Major Subject"),
        })
      );
    });
  });

  it("3. PROGRAM HEAD: Displays 'Adjustment Pending' when request already exists for the schedule", async () => {
    const mockPendingReq = {
      id: 1,
      scheduleId: 1,
      schedule_id: 1,
      requestedByUserId: 3,
      requesterName: "Dr. Alan Turing",
      requesterProgram: "ITP",
      subjectCode: "GE2",
      subjectName: "Readings in Philippine History",
      currentDay: "Monday",
      currentStartTime: "09:00",
      currentEndTime: "10:30",
      suggestedDay: "Monday",
      suggestedStartTime: "07:30",
      suggestedEndTime: "09:00",
      reason: "Need continuous major block",
      status: "Pending" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <ScheduleDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        schedule={mockSchedules[0] as any}
        onRequestAdjustment={vi.fn()}
        adjustmentRequest={mockPendingReq as any}
        userRole="program_head"
      />
    );

    // Verify Details Modal opened and shows disabled "Adjustment Pending" button and banner
    expect(screen.getByText("Assigned Class Schedule Details")).toBeInTheDocument();
    expect(screen.getByText(/Adjustment Request Pending:/i)).toBeInTheDocument();
    const pendingBtn = screen.getByRole("button", { name: /Adjustment Pending/i });
    expect(pendingBtn).toBeInTheDocument();
    expect(pendingBtn).toBeDisabled();
  });

  it("4. ADMIN: Displays pending requests banner and allows opening review modal", async () => {
    localStorage.setItem("userRole", "admin");
    localStorage.setItem("userName", "Academic Administrator");

    const mockPendingReq = {
      id: 1,
      scheduleId: 1,
      schedule_id: 1,
      requestedByUserId: 3,
      requesterName: "Dr. Alan Turing",
      requesterProgram: "ITP",
      subjectCode: "GE2",
      subjectName: "Readings in Philippine History",
      currentDay: "Monday",
      currentStartTime: "09:00",
      currentEndTime: "10:30",
      suggestedDay: "Monday",
      suggestedStartTime: "07:30",
      suggestedEndTime: "09:00",
      reason: "Need continuous major block",
      status: "Pending" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.startsWith("/schedule-adjustment-requests")) return Promise.resolve({ data: { data: [mockPendingReq] } });
      if (url.startsWith("/schedules")) return Promise.resolve({ data: { data: mockSchedules } });
      if (url.startsWith("/rooms")) return Promise.resolve({ data: { data: mockRooms } });
      if (url.startsWith("/subjects")) return Promise.resolve({ data: { data: mockSubjects } });
      if (url.startsWith("/faculty")) return Promise.resolve({ data: { data: mockFaculty } });
      if (url.startsWith("/sections")) return Promise.resolve({ data: { data: mockSections } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderComponent();

    // Verify Admin pending banner is displayed and review button is clickable
    const banner = await screen.findByTestId("admin-adjustment-requests-banner");
    expect(banner).toBeInTheDocument();

    const reviewBtn = screen.getByTestId("review-requests-banner-btn");
    expect(reviewBtn).toBeInTheDocument();
    fireEvent.click(reviewBtn);

    expect(await screen.findByText("Review Schedule Adjustment Request")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve & Update/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject/i })).toBeInTheDocument();
  });

  it("5. PROGRAM HEAD: Displays rejection explanation when request was declined by Admin", async () => {
    const mockRejectedReq = {
      id: 1,
      scheduleId: 1,
      requestedByUserId: 3,
      requesterName: "Dr. Alan Turing",
      requesterProgram: "ITP",
      subjectCode: "GE2",
      subjectName: "Readings in Philippine History",
      currentDay: "Monday",
      currentStartTime: "09:00",
      currentEndTime: "10:30",
      suggestedDay: "Monday",
      suggestedStartTime: "07:30",
      suggestedEndTime: "09:00",
      reason: "Need continuous major block",
      status: "Rejected" as const,
      adminResponse: "Cannot move due to conflict with General Education department meeting.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <ScheduleDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        schedule={mockSchedules[0] as any}
        onRequestAdjustment={vi.fn()}
        adjustmentRequest={mockRejectedReq as any}
        userRole="program_head"
      />
    );

    expect(screen.getByText(/Previous Adjustment Request Declined by Admin:/i)).toBeInTheDocument();
    expect(screen.getByText(/Cannot move due to conflict with General Education department meeting./i)).toBeInTheDocument();
  });
});

