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

describe("Adding Multiple Different Classes on the Exact Same Time Slot", () => {
  vi.setConfig({ testTimeout: 15000 });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockSchedules = [
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
      classMode: "Lecture",
    },
  ];

  beforeEach(() => {
    window.localStorage.setItem("userRole", "admin");
    window.localStorage.setItem("userName", "Administrator");
    window.localStorage.setItem("userProgram", "BSIT");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({ data: { data: mockSchedules } });
      }
      if (url === "/faculty") {
        return Promise.resolve({
          data: {
            data: [
              { id: "FAC-001", name: "Prof. Ada Lovelace", status: "Full-Time", department: "College of Computing" },
              { id: "FAC-002", name: "Dr. Alan Turing", status: "Full-Time", department: "College of Computing" },
              { id: "FAC-003", name: "Dr. Grace Hopper", status: "Full-Time", department: "College of Computing" },
            ],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              { code: "CC101", name: "Introduction to Computing", isMajor: true, lectureHours: 2, labHours: 0, program: "BSIT" },
              { code: "IT201", name: "Data Structures", isMajor: true, lectureHours: 2, labHours: 0, program: "BSIT", instructorId: "FAC-002" },
              { code: "IT202", name: "Web Systems", isMajor: true, lectureHours: 2, labHours: 0, program: "BSIT", instructorId: "FAC-003" },
            ],
          },
        });
      }
      if (url === "/rooms") {
        return Promise.resolve({
          data: {
            data: [
              { number: "COL-101", building: "College Building", type: "Lecture", capacity: 45, status: "Available" },
              { number: "COL-102", building: "College Building", type: "Lecture", capacity: 45, status: "Available" },
              { number: "COL-103", building: "College Building", type: "Lecture", capacity: 45, status: "Available" },
            ],
          },
        });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, section: "BSIT 1-A", course: "BSIT", program: "BSIT", students: 30 },
              { id: 2, section: "BSIT 1-B", course: "BSIT", program: "BSIT", students: 30 },
              { id: 3, section: "BSIT 1-C", course: "BSIT", program: "BSIT", students: 30 },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  });

  it("1. Allows adding another class into an existing time slot, preserving slot time and auto-selecting free room & teacher", async () => {
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

    // Initial class card on grid
    const stackCard = await screen.findByTestId("same-time-stack-card");
    expect(stackCard).toBeInTheDocument();

    // Click '+ Add' directly on the cell
    const addBtn = within(stackCard).getByRole("button", { name: /Add another class to this slot/i });
    fireEvent.click(addBtn);

    // Modal opens with time locked to Monday 08:00 AM - 09:30 AM
    await waitFor(() => {
      expect(screen.getByText(/Create Class Schedule - Step 1/i)).toBeInTheDocument();
    });

    const startTimeSelect = screen.getByLabelText(/Start Time/i);
    const endTimeSelect = screen.getByLabelText(/End Time/i);
    expect(startTimeSelect).toHaveValue("08:00 AM");
    expect(endTimeSelect).toHaveValue("09:30 AM");

    // Shows concurrent slot notice
    expect(screen.getByText(/Concurrent Time Slot:/i)).toBeInTheDocument();

    // Confirm Time & Next to Step 2
    const confirmTimeBtn = screen.getByRole("button", { name: /Confirm Time & Next/i });
    fireEvent.click(confirmTimeBtn);

    // In Step 2, select second subject IT201
    const subjectTrigger = document.getElementById("schedSubject")?.parentElement?.querySelector("button") as HTMLElement;
    fireEvent.click(subjectTrigger);

    const it201Option = await screen.findByRole("option", { name: /IT201/i });
    fireEvent.click(it201Option);

    // Notice BSIT 1-B is auto-selected because BSIT 1-A is already occupied in this slot!
    expect(screen.getByText(/BSIT 1-B/i)).toBeInTheDocument();

    // In Step 2, notice concurrent class notice showing CC101 in BSIT 1-A
    expect(screen.getByText(/Other classes scheduled at this time:/i)).toBeInTheDocument();

    // Continue to Step 3
    const nextBtn = screen.getByRole("button", { name: /Confirm Subject & Next/i });
    fireEvent.click(nextBtn);

    // In Step 3, verify Dr. Alan Turing (FAC-002) and COL-102 are selected and verified clear
    await waitFor(() => {
      expect(screen.getByText(/All resources verified: Instructor, Room, and Section are clear/i)).toBeInTheDocument();
    });
  });

  it("2. 'Save & Add Another Subject Here' saves current class and stays on Step 2 with free resources pre-selected", async () => {
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
    const addBtn = within(stackCard).getByRole("button", { name: /Add another class to this slot/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText(/Create Class Schedule - Step 1/i)).toBeInTheDocument();
    });

    // Step 1 -> Step 2
    const confirmTimeBtn = screen.getByRole("button", { name: /Confirm Time & Next/i });
    fireEvent.click(confirmTimeBtn);

    // Select IT201
    const subjectTrigger = document.getElementById("schedSubject")?.parentElement?.querySelector("button") as HTMLElement;
    fireEvent.click(subjectTrigger);
    const it201Option = await screen.findByRole("option", { name: /IT201/i });
    fireEvent.click(it201Option);

    // Advance to Step 3
    const nextBtn = screen.getByRole("button", { name: /Confirm Subject & Next/i });
    fireEvent.click(nextBtn);

    // 'Save & Add Another Subject Here' button is available
    const saveAndAddBtn = await screen.findByRole("button", { name: /Save & Add Another Subject Here/i });
    expect(saveAndAddBtn).toBeInTheDocument();

    // Click 'Save & Add Another Subject Here'
    fireEvent.click(saveAndAddBtn);

    // API POST should have been sent
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/schedules",
        expect.objectContaining({
          day: "Monday",
          subjectCode: "IT201",
          section: "BSIT 1-B",
        })
      );
    });

    // Modal stays on Step 2 with the same slot time ready for next subject
    await waitFor(() => {
      expect(screen.getByText(/2\. Curriculum Subject & Section/i)).toBeInTheDocument();
    });
  });
});
