import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
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

describe("Deleting Multiple Scheduled Class Items at Once", () => {
  vi.setConfig({ testTimeout: 15000 });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    window.history.pushState({}, "", "/schedules");
    window.localStorage.setItem("userRole", "admin");
    window.localStorage.setItem("userName", "Admin User");
    window.localStorage.setItem("userProgram", "BSIT");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "sched-1",
                day: "Monday",
                time: "08:00 AM - 09:30 AM",
                subjectCode: "CC101",
                subject: "Introduction to Computing",
                section: "BSIT 1-A",
                faculty: "Prof. Ada Lovelace",
                facultyId: "FAC-001",
                room: "COL-101",
                building: "College Building",
                modality: "Face-to-Face",
                program: "BSIT",
                color: "#2563eb",
              },
              {
                id: "sched-2",
                day: "Monday",
                time: "08:00 AM - 09:30 AM",
                subjectCode: "IT201",
                subject: "Data Structures",
                section: "BSIT 1-B",
                faculty: "Dr. Alan Turing",
                facultyId: "FAC-002",
                room: "COL-102",
                building: "College Building",
                modality: "Face-to-Face",
                program: "BSIT",
                color: "#7c3aed",
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
              { code: "CC101", name: "Introduction to Computing", program: "BSIT", isMajor: true },
              { code: "IT201", name: "Data Structures", program: "BSIT", isMajor: true },
            ],
          },
        });
      }
      if (url === "/rooms") {
        return Promise.resolve({
          data: {
            data: [
              { number: "COL-101", building: "College Building" },
              { number: "COL-102", building: "College Building" },
            ],
          },
        });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [
              { section: "BSIT 1-A", course: "BSIT", program: "BSIT" },
              { section: "BSIT 1-B", course: "BSIT", program: "BSIT" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    vi.mocked(api.post).mockResolvedValue({ data: { success: true, deletedCount: 2 } });
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
  });

  it("1. Allows selecting multiple classes in the same-time slot drawer and deleting them at once", async () => {
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

    const stackCard = await screen.findByTestId("same-time-stack-card");
    expect(stackCard).toBeInTheDocument();

    // Click on the multi-class slot card to open the drawer
    fireEvent.click(stackCard);

    // Verify the drawer modal opens showing both classes
    await waitFor(() => {
      expect(screen.getByText(/2 Concurrent Classes Scheduled/i)).toBeInTheDocument();
      expect(screen.getByText(/Select All in Slot/i)).toBeInTheDocument();
    });

    // Check "Select All in Slot"
    const selectAllCheckbox = screen.getByTestId("drawer-select-all-checkbox");
    fireEvent.click(selectAllCheckbox);

    // Verify the "Delete Selected (2)" button appears in the drawer
    const deleteSelectedBtn = await screen.findByTestId("drawer-delete-selected-btn");
    expect(deleteSelectedBtn).toBeInTheDocument();
    expect(deleteSelectedBtn).toHaveTextContent(/Delete Selected \(2\)/i);

    // Click "Delete Selected (2)"
    fireEvent.click(deleteSelectedBtn);

    // Verify bulk delete confirmation modal appears
    await waitFor(() => {
      expect(screen.getByText(/Remove 2 Scheduled Classes/i)).toBeInTheDocument();
      expect(screen.getByText(/The rooms, instructor timeslots, and section cohorts for these 2 schedules will be immediately freed up/i)).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: /Delete 2 Classes/i });
    fireEvent.click(confirmBtn);

    // Verify bulk-delete API was called with both schedule IDs
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/schedules/bulk-delete",
        expect.objectContaining({ ids: ["sched-1", "sched-2"] })
      );
    });
  });

  it("2. Allows selecting multiple classes via checkboxes in List View and deleting them simultaneously", async () => {
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

    await screen.findByTestId("same-time-stack-card");

    // Switch to List View
    const listViewBtn = screen.getByRole("button", { name: /List View of Class Sessions/i });
    fireEvent.click(listViewBtn);

    // Verify list view renders the select-all bar and item checkboxes
    await waitFor(() => {
      expect(screen.getByTestId("list-select-all-checkbox")).toBeInTheDocument();
      expect(screen.getByTestId("list-item-checkbox-sched-1")).toBeInTheDocument();
      expect(screen.getByTestId("list-item-checkbox-sched-2")).toBeInTheDocument();
    });

    // Check sched-1 and sched-2
    fireEvent.click(screen.getByTestId("list-item-checkbox-sched-1"));
    fireEvent.click(screen.getByTestId("list-item-checkbox-sched-2"));

    // Verify list bulk delete button appears
    const listBulkDeleteBtn = await screen.findByTestId("list-bulk-delete-btn");
    expect(listBulkDeleteBtn).toHaveTextContent(/Delete Selected \(2\)/i);

    // Click delete selected
    fireEvent.click(listBulkDeleteBtn);

    // Verify confirm modal
    await waitFor(() => {
      expect(screen.getByText(/Remove 2 Scheduled Classes/i)).toBeInTheDocument();
    });

    // Click confirm delete
    const confirmBtn = screen.getByRole("button", { name: /Delete 2 Classes/i });
    fireEvent.click(confirmBtn);

    // Verify bulk delete API call
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/schedules/bulk-delete",
        expect.objectContaining({ ids: ["sched-1", "sched-2"] })
      );
    });
  });

  it("3. Verifies top toolbar is uncluttered and allows 'Delete All in Slot' directly from same-time slot drawer", async () => {
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

    // Verify top buttons (Plot Time Schedules, Notify Faculty) and upper right Multi-Select are not present
    expect(screen.queryByText(/Plot Time Schedules/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Notify Faculty \(Gmail\)/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("toggle-select-mode-btn")).not.toBeInTheDocument();

    const stackCard = await screen.findByTestId("same-time-stack-card");
    fireEvent.click(stackCard);

    // Click "Delete All in Slot (2)"
    const clearSlotBtn = await screen.findByTestId("drawer-clear-slot-btn");
    expect(clearSlotBtn).toBeInTheDocument();
    expect(clearSlotBtn).toHaveTextContent(/Delete All in Slot \(2\)/i);
    fireEvent.click(clearSlotBtn);

    // Verify confirm modal appears
    await waitFor(() => {
      expect(screen.getByText(/Remove 2 Scheduled Classes/i)).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: /Delete 2 Classes/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/schedules/bulk-delete",
        expect.objectContaining({ ids: ["sched-1", "sched-2"] })
      );
    });
  });
});
