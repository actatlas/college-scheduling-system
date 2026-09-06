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

  it("displays multiple schedules in the same slot stacked on top of each other", async () => {
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

    // Wait for the schedules to be loaded and timetable grid to render
    await waitFor(() => {
      expect(screen.getByText(/Stacked \(2\)/i)).toBeInTheDocument();
    });

    // Both cards should be rendered and visible in the stacked slot
    expect(screen.getByText("CC101")).toBeInTheDocument();
    expect(screen.getByText("Introduction to Computing")).toBeInTheDocument();
    expect(screen.getByText("IT201")).toBeInTheDocument();
    expect(screen.getByText("Data Structures and Algorithms")).toBeInTheDocument();

    // Clicking CC101 brings it to the front
    const cc101Element = screen.getByText("CC101").closest(".stacked-card-wrapper");
    expect(cc101Element).toBeInTheDocument();
    fireEvent.click(cc101Element!);
    expect(cc101Element).toHaveClass("is-front");
  });

  it("allows toggling between stacked on top mode and expanded mode", async () => {
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
      expect(screen.getByText(/Stacked \(2\)/i)).toBeInTheDocument();
    });

    // Check stack mode container
    const stackContainer = screen.getByText(/Stacked \(2\)/i).closest(".stacked-schedule-container");
    const stackElement = stackContainer?.querySelector(".stacked-cards-stack");
    expect(stackElement).toHaveClass("mode-stacked");

    // Click toggle button to Expand
    const toggleBtn = screen.getByLabelText("Toggle stack view mode");
    fireEvent.click(toggleBtn);
    expect(stackElement).toHaveClass("mode-expanded");

    // Click toggle button again to Stack back
    fireEvent.click(toggleBtn);
    expect(stackElement).toHaveClass("mode-stacked");
  });
});
