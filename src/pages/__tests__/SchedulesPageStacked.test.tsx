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

describe("SchedulesPage Stacked Display in Same Time Slot", () => {
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
                subject: "Data Structures and Algorithms",
                section: "BSIT 2-B",
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
              { code: "IT201", name: "Data Structures and Algorithms", program: "BSIT", isMajor: true },
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
              { section: "1-A", course: "BSIT", program: "BSIT" },
              { section: "2-B", course: "BSIT", program: "BSIT" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("displays multiple schedules with exact same day and time in Tier 1 minimal pill", async () => {
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

    // Tier 1: Minimal single-line pill
    expect(within(stackCard).getByText("2 CLASSES")).toBeInTheDocument();
  });

  it("opens Tier 2 subject-only drawer and expands into Tier 3 detailed view on Details click", async () => {
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
    fireEvent.click(stackCard);

    // Tier 2: Drawer appears with required title format and clean subject-only rows
    await waitFor(() => {
      expect(screen.getByText("Monday • 08:00 AM - 09:30 AM (2 Classes)")).toBeInTheDocument();
      expect(screen.getByText(/2 Concurrent Classes Scheduled/i)).toBeInTheDocument();
    });

    const modalContent = document.querySelector(".stacked-group-modal-content") as HTMLElement;
    expect(modalContent).toBeInTheDocument();

    // Tier 2 shows Subject Code & Title
    expect(within(modalContent).getByText("CC101")).toBeInTheDocument();
    expect(within(modalContent).getByText("Introduction to Computing")).toBeInTheDocument();
    expect(within(modalContent).getByText("IT201")).toBeInTheDocument();
    expect(within(modalContent).getByText("Data Structures and Algorithms")).toBeInTheDocument();

    // Initially collapsed (faculty & room not visible yet)
    expect(within(modalContent).queryByText(/Prof. Ada Lovelace/i)).not.toBeInTheDocument();

    // Tier 3: Click "Details" button to expand the first subject
    const detailsBtns = within(modalContent).getAllByRole("button", { name: /Details/i });
    expect(detailsBtns.length).toBe(2);
    fireEvent.click(detailsBtns[0]);

    // Tier 3: Expanded row reveals full assignment details
    await waitFor(() => {
      expect(within(modalContent).getByText(/Prof. Ada Lovelace/i)).toBeInTheDocument();
      expect(within(modalContent).getByText(/COL-101/i)).toBeInTheDocument();
      expect(within(modalContent).getByText(/BSIT 1-A/i)).toBeInTheDocument();
      expect(within(modalContent).getByText(/Face-to-Face/i)).toBeInTheDocument();
    });

    // Verify action controls inside expanded row
    expect(within(modalContent).getByRole("button", { name: /Edit Schedule/i })).toBeInTheDocument();
    expect(within(modalContent).getByRole("button", { name: /Reassign Room/i })).toBeInTheDocument();
  });

  it("displays conflict pill in grid and reveals collision details when expanded in drawer", async () => {
    // Override API to return colliding rooms
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
                room: "COL-101",
                building: "College Building",
                modality: "Face-to-Face",
                program: "BSIT",
              },
              {
                id: "sched-2",
                day: "Monday",
                time: "08:00 AM - 09:30 AM",
                subjectCode: "IT201",
                subject: "Data Structures",
                section: "BSIT 2-B",
                faculty: "Dr. Alan Turing",
                room: "COL-101", // Collision on same room!
                building: "College Building",
                modality: "Face-to-Face",
                program: "BSIT",
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

    // Tier 1: Warning conflict pill in grid
    expect(within(stackCard).getByText(/⚠️ 2 CLASSES/i)).toBeInTheDocument();

    fireEvent.click(stackCard);

    await waitFor(() => {
      expect(screen.getByText(/Room Collision/i)).toBeInTheDocument();
    });

    const modalContent = document.querySelector(".stacked-group-modal-content") as HTMLElement;
    const detailsBtns = within(modalContent).getAllByRole("button", { name: /Details/i });
    fireEvent.click(detailsBtns[0]);

    await waitFor(() => {
      expect(within(modalContent).getByText(/Room Conflict:/i)).toBeInTheDocument();
    });
  });
});
