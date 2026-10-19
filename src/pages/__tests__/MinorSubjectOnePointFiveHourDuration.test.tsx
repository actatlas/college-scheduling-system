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

describe("Minor Subject 1.5 Hours Scheduling Verification", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.setItem("userRole", "admin"); // Dean / Admin
    window.localStorage.setItem("userName", "Dean of College");
    window.localStorage.setItem("userProgram", "BSIT");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === "/programs") {
        return Promise.resolve({
          data: {
            data: [
              { code: "BSIT", name: "Information Technology" },
              { code: "BAP", name: "Business Administration" },
            ],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              {
                code: "GE EL 2",
                name: "FO LA",
                units: 3,
                lectureHours: 1.5,
                labHours: 0,
                program: "ALL",
                isMajor: false,
                subjectType: "Minor",
                instructorId: "FAC-001",
                instructor: "Prof. Ada Lovelace",
              },
              {
                code: "GE EL 5",
                name: "Peace Education",
                units: 3,
                lectureHours: 2, // simulated legacy DB value of 2 hours
                labHours: 0,
                program: "ALL",
                isMajor: false,
                subjectType: "Minor",
                instructorId: "FAC-001",
                instructor: "Prof. Ada Lovelace",
              },
              {
                code: "IT101",
                name: "Computer Programming 1",
                units: 3,
                lectureHours: 2,
                labHours: 3,
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
              { id: "FAC-001", name: "Prof. Ada Lovelace", status: "Full-Time" },
            ],
          },
        });
      }
      if (url === "/rooms") {
        return Promise.resolve({
          data: {
            data: [
              { number: "COL-101", building: "College Building", type: "Lecture", status: "Available" },
            ],
          },
        });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, course: "BSIT", yearLevel: 1, section: "1-A", program: "BSIT" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  });

  it("1. Automatically assigns exactly 1.5 hours (90 mins) when scheduling a minor subject", async () => {
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

    // Step 1: Click 1.5h (Minor) preset button
    const minorPresetBtn = await screen.findByRole("button", { name: /1\.5h \(Minor\)/i });
    fireEvent.click(minorPresetBtn);

    // Confirm Start Time is 07:00 AM and End Time is 08:30 AM (1.5 hours)
    const startTimeSelect = screen.getByLabelText(/Start Time/i);
    expect(startTimeSelect).toHaveValue("07:00 AM");
    const endTimeSelect = screen.getByLabelText(/End Time/i);
    expect(endTimeSelect).toHaveValue("08:30 AM");

    // Click Confirm Time & Next to advance to Step 2
    const nextBtn = screen.getByRole("button", { name: /Confirm Time & Next/i });
    fireEvent.click(nextBtn);

    // Step 2: Open subject dropdown
    const subjectTrigger = await screen.findByRole("button", { name: /GE EL 2|Search course code/i });
    fireEvent.click(subjectTrigger);

    // Select GE EL 5 (which simulates legacy DB lectureHours = 2)
    const ge5Option = await screen.findByRole("option", { name: /GE EL 5 - Peace Education/i });
    fireEvent.click(ge5Option);

    // Verify Confirmed Time remains 1.5h and shows (1.5h Minor)
    expect(screen.getByText(/07:00 AM - 08:30 AM \(1\.5h Minor\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Lec 2h/i)).not.toBeInTheDocument();

    // Proceed to Step 3: Teacher & Room
    const confirmSubjectBtn = screen.getByRole("button", { name: /Confirm Subject & Next/i });
    fireEvent.click(confirmSubjectBtn);

    // Step 3: Save class schedule
    const saveBtn = await screen.findByRole("button", { name: /Confirm & Schedule Block/i });
    fireEvent.click(saveBtn);

    // Assert that the schedule is saved with 1.5h (07:00 AM - 08:30 AM) and NOT 2 hours
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/schedules",
        expect.objectContaining({
          subjectCode: "GE EL 5",
          time: "07:00 AM - 08:30 AM",
          start_time: "07:00 AM",
          end_time: "08:30 AM",
        })
      );
    });
  });

  it("2. Automatically adjusts to 1.5 hours when switching to minor subject GE EL 2", async () => {
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

    // In Step 1, select 08:00 AM start time
    const startTimeSelect = await screen.findByLabelText(/Start Time/i);
    fireEvent.change(startTimeSelect, { target: { value: "08:00 AM" } });

    // Click Confirm Time & Next
    const nextBtn = screen.getByRole("button", { name: /Confirm Time & Next/i });
    fireEvent.click(nextBtn);

    // In Step 2, switch subject to GE EL 2
    const subjectTrigger = await screen.findByRole("button", { name: /GE EL 2|Search course code/i });
    fireEvent.click(subjectTrigger);

    const ge2Option = await screen.findByRole("option", { name: /GE EL 2 - FO LA/i });
    fireEvent.click(ge2Option);

    // The duration must adapt to 1.5 hours (08:00 AM - 09:30 AM)
    expect(screen.getByText(/08:00 AM - 09:30 AM/i)).toBeInTheDocument();

    // Proceed to Step 3 and save
    const confirmSubjectBtn = screen.getByRole("button", { name: /Confirm Subject & Next/i });
    fireEvent.click(confirmSubjectBtn);

    const saveBtn = await screen.findByRole("button", { name: /Confirm & Schedule Block/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/schedules",
        expect.objectContaining({
          subjectCode: "GE EL 2",
          time: "08:00 AM - 09:30 AM",
          start_time: "08:00 AM",
          end_time: "09:30 AM",
        })
      );
    });
  });
});
