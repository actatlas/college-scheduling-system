import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
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

describe("SchedulesPage - Concurrent Multi-Subject Scheduling in Same Time Slot", () => {
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
              { number: "COL-101", building: "College Building", capacity: 40, type: "Lecture Room" },
              { number: "COL-102", building: "College Building", capacity: 40, type: "Lecture Room" },
            ],
          },
        });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [
              { section: "BSIT 1-A", program: "BSIT", course: "BSIT", yearLevel: "1", students: 35 },
              { section: "BSIT 2-B", program: "BSIT", course: "BSIT", yearLevel: "2", students: 30 },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("renders '+ Add Subject' on single schedule card slot to add another subject to same time", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("CC101")).toBeInTheDocument();
    });

    // Check that + Add Subject button is present for the slot
    const addSubjectBtns = screen.getAllByRole("button", { name: /\+ Add Subject|Add another subject to slot/i });
    expect(addSubjectBtns.length).toBeGreaterThan(0);

    // Clicking + Add Subject opens the modal with pre-filled day & time
    fireEvent.click(addSubjectBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Create Class Schedule/i)).toBeInTheDocument();
    });
  });

  it("shows concurrent slot indicator and Save & Add Another Subject button in modal", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("CC101")).toBeInTheDocument();
    });

    const addBtns = screen.getAllByRole("button", { name: /\+ Add Subject|Add another subject to slot/i });
    fireEvent.click(addBtns[0]);

    // In Step 1, verify Concurrent Time Slot alert is visible
    await waitFor(() => {
      expect(screen.getByText(/Concurrent Time Slot:/i)).toBeInTheDocument();
    });

    // Continue to Step 2
    const continueBtn = screen.getByRole("button", { name: /Continue to Resource Assignment/i });
    fireEvent.click(continueBtn);

    // In Step 2, verify 'Save & Add Another Subject Here' button exists
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Save & Add Another Subject Here/i })).toBeInTheDocument();
    });
  });
});
