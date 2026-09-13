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

describe("SchedulesPage Staggered Times (7:00 AM & 7:30 AM multi-track)", () => {
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
                id: "sched-7am",
                day: "Monday",
                time: "07:00 AM - 08:30 AM",
                subjectCode: "IT101",
                subject: "Computer Programming 1",
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
                id: "sched-730am",
                day: "Monday",
                time: "07:30 AM - 09:00 AM",
                subjectCode: "BA101",
                subject: "Principles of Management",
                section: "BSBA 1-A",
                faculty: "Dr. Mary Cruz",
                facultyId: "FAC-002",
                room: "COL-102",
                building: "College Building",
                modality: "Face-to-Face",
                program: "BAP",
                color: "#10b981",
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
              { id: "FAC-002", name: "Dr. Mary Cruz", department: "BAP" },
            ],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              { code: "IT101", name: "Computer Programming 1", program: "BSIT", isMajor: true },
              { code: "BA101", name: "Principles of Management", program: "BAP", isMajor: true },
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
              { section: "1-A", course: "BSBA", program: "BAP" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("renders both 7:00 AM and 7:30 AM classes simultaneously with accurate slot positioning", async () => {
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

    // Wait for both subjects to render
    expect(await screen.findByText("IT101")).toBeInTheDocument();
    expect(screen.getByText("Computer Programming 1")).toBeInTheDocument();
    expect(screen.getByText("BA101")).toBeInTheDocument();
    expect(screen.getByText("Principles of Management")).toBeInTheDocument();

    // Verify both blocks exist on Monday
    const mondayColumn = document.querySelector('.timetable-day-column[data-day="Monday"]');
    expect(mondayColumn).toBeInTheDocument();

    const blocks = mondayColumn?.querySelectorAll(".timetable-schedule-positioned-block");
    expect(blocks?.length).toBe(2);

    // Block 1 (7:00 AM) starts at top 0px
    const block1 = blocks?.[0] as HTMLElement;
    expect(block1.style.top).toBe("0px");

    // Block 2 (7:30 AM) starts at top 52px (1 slot down)
    const block2 = blocks?.[1] as HTMLElement;
    expect(block2.style.top).toBe("52px");

    // Both blocks render in side-by-side tracks (approx 50% width each)
    expect(block1.style.width).toContain("50%");
    expect(block2.style.width).toContain("50%");
    expect(block1.style.left).toContain("0%");
    expect(block2.style.left).toContain("50%");
  });
});
