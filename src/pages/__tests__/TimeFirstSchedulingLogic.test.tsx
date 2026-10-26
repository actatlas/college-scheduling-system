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

describe("Dean Time-First Class Schedule Logic & Minimal Form", () => {
  vi.setConfig({ testTimeout: 15000 });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    window.localStorage.setItem("userRole", "admin");
    window.localStorage.setItem("userName", "Dean Officer");
    window.localStorage.setItem("userProgram", "BSIT");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "sched-existing",
                day: "Monday",
                time: "07:00 AM - 08:30 AM",
                subjectCode: "GE101",
                subject: "Understanding the Self",
                section: "BSIT 1-A",
                faculty: "Prof. Ada Lovelace",
                facultyId: "FAC-001",
                room: "COL-101",
                building: "College Building",
                modality: "Face-to-Face",
                program: "ALL",
                isMajor: false,
                classMode: "Lecture",
              },
            ],
          },
        });
      }
      if (url === "/faculty") {
        return Promise.resolve({
          data: {
            data: [
              { id: "FAC-001", name: "Prof. Ada Lovelace", department: "ITP", status: "Full-Time" },
              { id: "FAC-002", name: "Dr. Alan Turing", department: "ITP", status: "Full-Time" },
            ],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              { code: "GE101", name: "Understanding the Self", program: "ALL", isMajor: false, lectureHours: 1.5, labHours: 0 },
              { code: "IT101", name: "Computer Programming 1", program: "BSIT", isMajor: true, lectureHours: 2, labHours: 3 },
            ],
          },
        });
      }
      if (url === "/rooms") {
        return Promise.resolve({
          data: {
            data: [
              { number: "COL-101", building: "College Building", type: "Lecture", capacity: 40 },
              { number: "COL-102", building: "College Building", type: "Lecture", capacity: 40 },
              { number: "LAB-201", building: "College Building", type: "Laboratory", capacity: 35 },
            ],
          },
        });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [
              { section: "1-A", course: "BSIT", program: "BSIT", students: 30 },
              { section: "1-B", course: "BSIT", program: "BSIT", students: 30 },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  });

  it("1. Presents Designated Time First when the Dean opens Schedule Class", async () => {
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

    // Modal title renders
    expect(await screen.findByText(/Create Class Schedule - Step 1: Set Class Time/i)).toBeInTheDocument();

    // Step 1: Designated Class Time is prominently displayed first at the top
    expect(screen.getByText(/1\. Select Designated Class Time First/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teaching Day/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Time/i)).toBeInTheDocument();

    // Stepper navigation indicates the 3 distinct steps
    expect(screen.getByText(/Designate Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Subject & Section/i)).toBeInTheDocument();
    expect(screen.getByText(/Teacher & Room/i)).toBeInTheDocument();

    // Confirm Time & Next button is present
    expect(screen.getByRole("button", { name: /Confirm Time & Next/i })).toBeInTheDocument();
  });

  it("2. Allows the Dean to select quick duration presets (1.5h, 2.0h, 3.0h) to perfectly fit scheduling time", async () => {
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

    await screen.findByText(/1\. Select Designated Class Time First/i);

    // Click 2.0h (Major Lec)
    const btn2h = screen.getByRole("button", { name: /2\.0h \(Major Lec\)/i });
    fireEvent.click(btn2h);

    // End time should snap to 2.0 hours from 07:00 AM (09:00 AM)
    const endTimeSelect = screen.getByLabelText(/End Time/i) as HTMLSelectElement;
    expect(endTimeSelect.value).toBe("09:00 AM");

    // Click 3.0h (Lab)
    const btn3h = screen.getByRole("button", { name: /3\.0h \(Lab\)/i });
    fireEvent.click(btn3h);

    // End time should snap to 3.0 hours from 07:00 AM (10:00 AM)
    expect(endTimeSelect.value).toBe("10:00 AM");

    // Click 1.5h (Minor)
    const btn15h = screen.getByRole("button", { name: /1\.5h \(Minor\)/i });
    fireEvent.click(btn15h);

    // End time snaps to 1.5 hours (08:30 AM)
    expect(endTimeSelect.value).toBe("08:30 AM");
  });

  it("3. Follows sequential flow: Dean adds time first, confirms time, then adds subject & section, then teacher & room", async () => {
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

    await screen.findByText(/1\. Select Designated Class Time First/i);

    // Step 1: Change day to Tuesday to ensure clean slot without mock conflicts
    const daySelect = screen.getByLabelText(/Teaching Day/i) as HTMLSelectElement;
    fireEvent.change(daySelect, { target: { value: "Tuesday" } });

    // Step 1: Set 2.0h duration
    const btn2h = screen.getByRole("button", { name: /2\.0h \(Major Lec\)/i });
    fireEvent.click(btn2h);

    // Confirm Time & advance to Step 2
    const confirmTimeBtn = screen.getByRole("button", { name: /Confirm Time & Next/i });
    fireEvent.click(confirmTimeBtn);

    // Step 2: Subject & Section step is now active
    expect(await screen.findByText(/2\. Curriculum Subject & Section/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmed Time:/i)).toBeInTheDocument();

    // Select subject IT101
    const subjectTrigger = screen.getByRole("button", { name: /GE101 - Understanding the Self/i });
    fireEvent.click(subjectTrigger);

    const itOption = await screen.findByRole("option", { name: /IT101 - Computer Programming 1/i });
    fireEvent.click(itOption);

    // Section is auto-populated or can be selected
    const sectionTrigger = document.getElementById("schedSection")?.parentElement?.querySelector("button") as HTMLElement;
    expect(sectionTrigger).toBeInTheDocument();

    // Advance to Step 3: Teacher & Room
    const confirmSubjectBtn = screen.getByRole("button", { name: /Confirm Subject & Next/i });
    fireEvent.click(confirmSubjectBtn);

    // Step 3: Teacher & Room step is now active
    expect(await screen.findByText(/3\. Instructor Assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/Classroom & Verification/i)).toBeInTheDocument();

    // Click 'Save Class Schedule'
    const saveBtn = screen.getByRole("button", { name: /Confirm & Schedule Block|Save Class Schedule/i });
    expect(saveBtn).toBeInTheDocument();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it.skip("4. Allows the Dean to plot a time slot to the grid first, then click 'Add Subject & Room' to assign resources", async () => {
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

    await screen.findByText(/1\. Select Designated Class Time First/i);

    // Dean chooses Friday 07:00 AM - 08:30 AM (1.5h)
    const daySelect = screen.getByLabelText(/Teaching Day/i) as HTMLSelectElement;
    fireEvent.change(daySelect, { target: { value: "Friday" } });

    const btn15h = screen.getByRole("button", { name: /1\.5h \(Minor\)/i });
    fireEvent.click(btn15h);

    // Dean clicks "Plot to Grid (Assign Later)"
    const plotBtn = screen.getByRole("button", { name: /Plot to Grid \(Assign Later\)/i });
    fireEvent.click(plotBtn);

    // The modal closes and the plotted card appears on the grid
    const plottedCard = await screen.findByTestId("plotted-slot-card");
    expect(plottedCard.querySelector(".plotted-time-badge")?.textContent).toBe("Plotted");
    expect(screen.getByText(/Ready for Subject & Room/i)).toBeInTheDocument();

    // Dean clicks "+ Add Subject & Room" on the plotted time slot
    const addSubjectRoomBtn = screen.getByRole("button", { name: /Add Subject & Room/i });
    fireEvent.click(addSubjectRoomBtn);

    // Modal directly opens at Step 2 (Subject & Section) with Friday and time preloaded
    expect(await screen.findByText(/2\. Curriculum Subject & Section/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmed Time:/i)).toBeInTheDocument();

    // Confirm Subject & Next
    const confirmSubjectBtn = screen.getByRole("button", { name: /Confirm Subject & Next/i });
    fireEvent.click(confirmSubjectBtn);

    // Step 3: Teacher & Room
    expect(await screen.findByText(/3\. Instructor Assignment/i)).toBeInTheDocument();

    // Save
    const saveBtn = screen.getByRole("button", { name: /Confirm & Schedule Block|Save Class Schedule/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it("5. Verifies Plot Time Schedules button is not present next to Schedule Class", async () => {
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

    // Verify Schedule Class is rendered but Plot Time Schedules is removed
    expect(await screen.findByRole("button", { name: /Schedule Class/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Plot Time Schedules/i })).not.toBeInTheDocument();
  });
});
