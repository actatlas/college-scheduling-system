import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { FacultyPage } from "../FacultyPage";
import { SchedulesPage } from "../SchedulesPage";
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

describe("Faculty Directory: Permission Requests Tab & Multi-Faculty Bulk Actions", () => {
  const mockFaculty = [
    { id: "T-001", name: "Prof. Ada Lovelace", department: "Information Technology", email: "ada@srcb.edu.ph", status: "Full-Time", maxLoadHours: 24 },
    { id: "T-002", name: "Prof. Alan Turing", department: "Information Technology", email: "alan@srcb.edu.ph", status: "Full-Time", maxLoadHours: 24 },
    { id: "T-003", name: "Prof. Grace Hopper", department: "Information Technology", email: "grace@srcb.edu.ph", status: "Part-Time", maxLoadHours: 12 },
  ];

  const mockRequests = [
    {
      id: 1,
      requesterName: "Dr. Alan Turing",
      requesterProgram: "ITP",
      subjectCode: "IT101",
      subjectName: "Introduction to Computing",
      sectionName: "BSIT 1-A",
      requestedAction: "SCHEDULE_ADJUSTMENT",
      status: "Pending",
      currentDay: "Monday",
      currentStartTime: "07:30",
      currentEndTime: "09:00",
      suggestedDay: "Wednesday",
      suggestedStartTime: "09:00",
      suggestedEndTime: "10:30",
      reason: "Classroom collision conflict",
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    localStorage.setItem("userRole", "admin");
    localStorage.setItem("userName", "Dean Admin");
    window.history.pushState({}, "", "/faculty");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.startsWith("/faculty")) {
        return Promise.resolve({ data: { data: mockFaculty } });
      }
      if (url.startsWith("/schedule-adjustment-requests")) {
        return Promise.resolve({ data: { data: mockRequests } });
      }
      if (url.startsWith("/rooms")) {
        return Promise.resolve({ data: { data: [{ number: "COL-101", building: "College Building" }] } });
      }
      if (url.startsWith("/schedules")) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.startsWith("/subjects")) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.startsWith("/sections")) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    vi.mocked(api.post).mockResolvedValue({ data: { success: true, deletedCount: 2, updatedCount: 2 } });
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("1. Allows selecting multiple faculty members and provides selection to Delete or Remove them", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <ProgramProvider>
              <FacultyPage />
            </ProgramProvider>
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Wait for faculty table to render
    await screen.findByText("Prof. Ada Lovelace");

    // Check multiple checkboxes
    const checkAda = screen.getByTestId("checkbox-faculty-T-001");
    const checkAlan = screen.getByTestId("checkbox-faculty-T-002");
    fireEvent.click(checkAda);
    fireEvent.click(checkAlan);

    // Bulk selection toolbar should appear
    expect(screen.getByRole("region", { name: /bulk actions toolbar/i })).toBeInTheDocument();
    expect(screen.getByTestId("bulk-delete-faculty-btn")).toHaveTextContent(/Delete Selected \(2\)/i);

    // Verify Action dropdown and buttons are present
    const actionSelect = screen.getByTestId("bulk-action-select");
    expect(actionSelect).toBeInTheDocument();
    expect(screen.getByTestId("bulk-delete-faculty-btn")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-remove-faculty-btn")).toBeInTheDocument();

    // Choose "Remove from Active Roster" in action dropdown and click Apply
    fireEvent.change(actionSelect, { target: { value: "remove" } });
    const applyBtn = screen.getByTestId("apply-bulk-faculty-action-btn");
    fireEvent.click(applyBtn);

    // Verify the action modal opens with choices
    expect(screen.getByText(/Remove 2 Faculty Members from Roster/i)).toBeInTheDocument();
    expect(screen.getByTestId("radio-bulk-remove")).toBeChecked();

    // Click confirm to execute bulk remove
    const confirmBtn = screen.getByTestId("confirm-bulk-faculty-action-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/faculty/bulk-remove",
        expect.objectContaining({ ids: ["T-001", "T-002"], action: "deactivate" })
      );
    });
  });

  it("2. Allows bulk deleting selected faculty members via direct Delete Selected button", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <ProgramProvider>
              <FacultyPage />
            </ProgramProvider>
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await screen.findByText("Prof. Ada Lovelace");

    const checkAda = screen.getByTestId("checkbox-faculty-T-001");
    const checkGrace = screen.getByTestId("checkbox-faculty-T-003");
    fireEvent.click(checkAda);
    fireEvent.click(checkGrace);

    // Click Delete Selected button
    const bulkDeleteBtn = screen.getByTestId("bulk-delete-faculty-btn");
    fireEvent.click(bulkDeleteBtn);

    // Modal opens with Delete Permanently checked
    expect(screen.getByText(/Delete 2 Faculty Members/i)).toBeInTheDocument();
    expect(screen.getByTestId("radio-bulk-delete")).toBeChecked();

    // Confirm deletion
    const confirmBtn = screen.getByTestId("confirm-bulk-faculty-action-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/faculty/bulk-delete",
        expect.objectContaining({ ids: ["T-001", "T-003"] })
      );
    });
  });

  it("3. Renders Permission Requests in Faculty Directory and allows reviewing requests", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <ProgramProvider>
              <FacultyPage />
            </ProgramProvider>
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Verify pending banner is present on faculty page
    const banner = await screen.findByTestId("admin-adjustment-requests-banner");
    expect(banner).toBeInTheDocument();

    // Click Permission Requests tab
    const requestsTab = screen.getByTestId("permission-requests-tab-btn");
    fireEvent.click(requestsTab);

    // Verify requests table and header are rendered
    expect(await screen.findByText(/Program Head Academic Permission Requests/i)).toBeInTheDocument();
    expect(screen.getByText("IT101 – Introduction to Computing")).toBeInTheDocument();

    // Click Review & Decide button
    const reviewBtn = screen.getByRole("button", { name: /Review & Decide/i });
    fireEvent.click(reviewBtn);

    // Verify AdminAdjustmentReviewModal opens
    expect(await screen.findByText(/Review Schedule Adjustment Request/i)).toBeInTheDocument();
  });

  it("4. Verifies SchedulesPage no longer renders Permission Requests tab or banner", async () => {
    window.history.pushState({}, "", "/schedules");
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

    await screen.findByText(/Scheduled Classes/i);

    // Verify Permission Requests tab is NOT in SchedulesPage
    expect(screen.queryByRole("button", { name: /Permission Requests/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-adjustment-requests-banner")).not.toBeInTheDocument();
  });
});
