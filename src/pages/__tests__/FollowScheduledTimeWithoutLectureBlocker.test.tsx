import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
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

describe("Follow Scheduled Time Without Rigid 2-Hour Lecture Blocker", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.setItem("userRole", "admin"); // Dean / Administrator
    window.localStorage.setItem("userName", "Dean of College");
    window.localStorage.setItem("userProgram", "BSIT");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === "/programs") {
        return Promise.resolve({
          data: {
            data: [{ code: "BSIT", name: "Information Technology" }],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              {
                code: "IT 101",
                name: "Computer Programming 1",
                units: 3,
                lectureHours: 2, // 2-hour lecture default in DB
                labHours: 0,
                program: "BSIT",
                isMajor: true,
                subjectType: "Major",
                instructorId: "FAC-001",
                instructor: "Prof. Ada Lovelace",
              },
              {
                code: "CC 102",
                name: "Data Structures and Algorithms",
                units: 3,
                lectureHours: 2, // 2-hour lecture default
                labHours: 0,
                program: "BSIT",
                isMajor: true,
                subjectType: "Major",
                instructorId: "FAC-001",
                instructor: "Prof. Ada Lovelace",
              },
            ],
          },
        });
      }
      if (url === "/faculty") {
        return Promise.resolve({
          data: {
            data: [
              { id: "FAC-001", name: "Prof. Ada Lovelace", status: "Full-Time", department: "College of Computing" },
            ],
          },
        });
      }
      if (url === "/rooms") {
        return Promise.resolve({
          data: {
            data: [
              { number: "COL-101", building: "College Building", type: "Lecture", status: "Available", capacity: 45 },
            ],
          },
        });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, course: "BSIT", yearLevel: 1, section: "1-A", program: "BSIT", students: 30 },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  });

  it("1. Follows the scheduled time (e.g. 1.5h: 07:30 AM - 09:00 AM) and does not reset time to 2h when picking a lecture", async () => {
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

    // Open Schedule Class modal
    const scheduleBtn = await screen.findByRole("button", { name: /Schedule Class/i });
    fireEvent.click(scheduleBtn);

    // Step 1: Set scheduled time to 07:30 AM - 09:00 AM (1.5h slot)
    const startTimeSelect = screen.getByLabelText(/Start Time/i);
    fireEvent.change(startTimeSelect, { target: { value: "07:30 AM" } });

    const endTimeSelect = screen.getByLabelText(/End Time/i);
    fireEvent.change(endTimeSelect, { target: { value: "09:00 AM" } });

    expect(startTimeSelect).toHaveValue("07:30 AM");
    expect(endTimeSelect).toHaveValue("09:00 AM");

    // Click Confirm Time & Next to advance to Step 2
    const nextBtn = screen.getByRole("button", { name: /Confirm Time & Next/i });
    fireEvent.click(nextBtn);

    // Step 2: Select major lecture IT 101 (which has 2h lecture requirement in DB)
    const subjectTrigger = await screen.findByRole("button", { name: /IT 101|Search course code/i });
    fireEvent.click(subjectTrigger);

    const itOption = await screen.findByRole("option", { name: /IT 101 - Computer Programming 1/i });
    fireEvent.click(itOption);

    // Verify that the scheduled time is FOLLOWED and NOT reset to 2 hours (07:30 AM - 09:30 AM)
    expect(screen.getByText(/07:30 AM - 09:00 AM/i)).toBeInTheDocument();
    expect(screen.queryByText(/07:30 AM - 09:30 AM/i)).not.toBeInTheDocument();

    // Proceed to Step 3: Teacher & Room
    const confirmSubjectBtn = screen.getByRole("button", { name: /Confirm Subject & Next/i });
    fireEvent.click(confirmSubjectBtn);

    // Step 3: Teacher and Room are added, click Confirm & Schedule Block
    const saveBtn = await screen.findByRole("button", { name: /Confirm & Schedule Block/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    // Assert that the schedule is confirmed and saved with the exact scheduled time (07:30 AM - 09:00 AM)
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/schedules",
        expect.objectContaining({
          subjectCode: "IT 101",
          time: "07:30 AM - 09:00 AM",
          start_time: "07:30 AM",
          end_time: "09:00 AM",
          followScheduledTime: true,
        })
      );
    });
  }, 15000);

  it("2. When switching between Lecture and Lab mode, keeps the scheduled time and does not reset time again", async () => {
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

    const scheduleBtn = await screen.findByRole("button", { name: /Schedule Class/i });
    fireEvent.click(scheduleBtn);

    // Set custom slot: 09:00 AM - 10:30 AM (1.5 hours)
    const startTimeSelect = screen.getByLabelText(/Start Time/i);
    fireEvent.change(startTimeSelect, { target: { value: "09:00 AM" } });
    const endTimeSelect = screen.getByLabelText(/End Time/i);
    fireEvent.change(endTimeSelect, { target: { value: "10:30 AM" } });

    // Confirm Time & Next
    fireEvent.click(screen.getByRole("button", { name: /Confirm Time & Next/i }));

    // Toggle mode button to Lecture
    const lectureModeBtn = await screen.findByRole("button", { name: /Lecture/i });
    fireEvent.click(lectureModeBtn);

    // Scheduled time remains 09:00 AM - 10:30 AM
    expect(screen.getByText(/09:00 AM - 10:30 AM/i)).toBeInTheDocument();
    expect(screen.queryByText(/09:00 AM - 11:00 AM/i)).not.toBeInTheDocument();

    // Advance to Step 3 and save
    fireEvent.click(screen.getByRole("button", { name: /Confirm Subject & Next/i }));

    const saveBtn = await screen.findByRole("button", { name: /Confirm & Schedule Block/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/schedules",
        expect.objectContaining({
          time: "09:00 AM - 10:30 AM",
          start_time: "09:00 AM",
          end_time: "10:30 AM",
        })
      );
    });
  }, 15000);
});
