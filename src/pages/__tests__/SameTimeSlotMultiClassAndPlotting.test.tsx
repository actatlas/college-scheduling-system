import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { SchedulesPage } from "../SchedulesPage";
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

describe("SchedulesPage - Same Time Slot Multi-Class Viewing and Re-Adding", () => {
  vi.setConfig({ testTimeout: 15000 });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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
              { id: "FAC-003", name: "Dr. Grace Hopper", department: "ITP" },
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
              { code: "IT202", name: "Web Systems", program: "BSIT", isMajor: true },
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
              { number: "COL-103", building: "College Building" },
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
              { section: "BSIT 1-C", course: "BSIT", program: "BSIT" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("1. Displays preview items and a direct quick '+ Add' button on multi-class cell", async () => {
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

    // Verify both classes are viewable directly in the cell preview
    expect(within(stackCard).getByText("CC101")).toBeInTheDocument();
    expect(within(stackCard).getByText("BSIT 1-A")).toBeInTheDocument();
    expect(within(stackCard).getByText("IT201")).toBeInTheDocument();
    expect(within(stackCard).getByText("BSIT 1-B")).toBeInTheDocument();

    // Verify quick add button exists on the cell
    const quickAddBtn = within(stackCard).getByRole("button", { name: /Add another class to this slot/i });
    expect(quickAddBtn).toBeInTheDocument();

    // Clicking quick add button opens schedule modal pre-locked to Monday 08:00 AM - 09:30 AM
    fireEvent.click(quickAddBtn);

    await waitFor(() => {
      expect(screen.getByText(/Create Class Schedule/i)).toBeInTheDocument();
    });
  });

  it("2. Drawer modal allows viewing all classes in slot and offers both '+ Add Subject' and '+ Plot Another Slot'", async () => {
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
    fireEvent.click(stackCard);

    // Modal drawer opens
    await waitFor(() => {
      expect(screen.getByText(/2 Concurrent Classes Scheduled/i)).toBeInTheDocument();
    });

    // Both action buttons in header and footer are present
    const addSubjectBtn = screen.getByRole("button", { name: /\+ Add Subject|Add another subject to slot/i });
    const plotAnotherBtns = screen.getAllByRole("button", { name: /\+ Plot Another Slot/i });
    expect(addSubjectBtn).toBeInTheDocument();
    expect(plotAnotherBtns.length).toBeGreaterThanOrEqual(1);

    // Footer CTA is also present
    expect(screen.getByText(/Different class or section at this same time\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Add Another Class Here/i })).toBeInTheDocument();

    // Click '+ Plot Another Slot'
    fireEvent.click(plotAnotherBtns[0]);

    // Modal closes and plotted slot is added to the timetable
    await waitFor(() => {
      expect(screen.queryByText(/2 Concurrent Classes Scheduled/i)).not.toBeInTheDocument();
    });
  });
});
