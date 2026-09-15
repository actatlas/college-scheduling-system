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

  it("displays multiple schedules with exact same day and time in one compact stack card", async () => {
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

    expect(within(stackCard).getByText("2 CLASSES")).toBeInTheDocument();
    expect(within(stackCard).getByText("08:00 AM - 09:30 AM")).toBeInTheDocument();
    expect(within(stackCard).getByText("CC101")).toBeInTheDocument();
    expect(within(stackCard).getByText("IT201")).toBeInTheDocument();
    expect(within(stackCard).getByText(/View 2 Classes/i)).toBeInTheDocument();
  });

  it("opens the Stacked Schedules Modal when clicking the stack card, showing all classes", async () => {
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

    // Verify modal appears with all schedules and readable metadata
    await waitFor(() => {
      expect(screen.getByText(/2 Concurrent Classes Scheduled/i)).toBeInTheDocument();
    });

    const modalContent = document.querySelector(".stacked-group-modal-content") as HTMLElement;
    expect(modalContent).toBeInTheDocument();

    expect(within(modalContent).getByText("Introduction to Computing")).toBeInTheDocument();
    expect(within(modalContent).getByText("Data Structures and Algorithms")).toBeInTheDocument();
    expect(within(modalContent).getByText(/Prof. Ada Lovelace/i)).toBeInTheDocument();
    expect(within(modalContent).getByText(/Dr. Alan Turing/i)).toBeInTheDocument();
    expect(within(modalContent).getByText(/COL-101/i)).toBeInTheDocument();
    expect(within(modalContent).getByText(/COL-102/i)).toBeInTheDocument();
  });
});
