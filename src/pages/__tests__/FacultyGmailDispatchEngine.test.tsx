import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { SchedulesPage } from "../SchedulesPage";
import { ToastProvider } from "../../components/common/Toast";
import { ProgramProvider } from "../../contexts/ProgramContext";
import { NotificationProvider } from "../../contexts/NotificationContext";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("../../data/apiClient", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: vi.fn().mockResolvedValue({ data: { data: {} } }),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

describe("Automated Faculty Gmail Dispatch Engine", () => {
  const mockSchedules = [
    {
      id: "1",
      day: "Monday",
      time: "08:00 AM - 09:30 AM",
      subjectCode: "CS101",
      subject: "Computer Programming 1",
      section: "BSIT 1-A",
      faculty: "Prof. Ada Lovelace",
      facultyId: "T-IT-001",
      room: "COL-101",
      building: "College Building",
      modality: "Face-to-Face",
      color: "#0284c7",
      status: "Confirmed",
    },
  ];

  const mockFaculty = [
    {
      id: "T-IT-001",
      name: "Prof. Ada Lovelace",
      email: "adalovelace-it@srcb.edu.ph",
      phone: "0917-101-0001",
      status: "Full-Time",
      department: "ITP",
      subjects: ["CS101"],
    },
  ];

  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    localStorage.clear();
    localStorage.setItem("userRole", "admin");
    localStorage.setItem("userName", "Dean of Student Affairs");

    mockGet.mockImplementation((url: string) => {
      if (url === "/schedules") return Promise.resolve({ data: { data: mockSchedules } });
      if (url === "/faculty") return Promise.resolve({ data: { data: mockFaculty } });
      if (url === "/rooms") return Promise.resolve({ data: { data: [{ number: "COL-101", capacity: 40, building: "College Building" }] } });
      if (url === "/sections") return Promise.resolve({ data: { data: [{ id: "1", section: "BSIT 1-A", students: 35, programCode: "BSIT" }] } });
      if (url.startsWith("/subjects")) return Promise.resolve({ data: { data: [{ code: "CS101", name: "Computer Programming 1", units: 3, lectureHours: 2, labHours: 3 }] } });
      if (url.startsWith("/faculty-dispatch/preview")) {
        return Promise.resolve({
          data: {
            data: {
              faculty: mockFaculty[0],
              schedules: [
                {
                  id: 1,
                  subject_code: "CS101",
                  subject_name: "Computer Programming 1",
                  units: 3,
                  section_name: "BSIT 1-A",
                  day: "Monday",
                  start_time: "08:00:00",
                  end_time: "09:30:00",
                  room_number: "COL-101",
                },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    mockPost.mockResolvedValue({
      data: {
        message: "Schedule successfully dispatched to Prof. Ada Lovelace via institutional Gmail.",
      },
    });
  });

  it("1. Opens Gmail Dispatch modal and renders formatted summary with cubicle advisory note", async () => {
    render(
      <BrowserRouter>
        <NotificationProvider>
          <ProgramProvider>
            <ToastProvider>
              <SchedulesPage />
            </ToastProvider>
          </ProgramProvider>
        </NotificationProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Notify Faculty (Gmail)")).toBeInTheDocument();
    });

    // Open Dispatch Modal
    const notifyBtn = screen.getByRole("button", { name: /Notify Faculty \(Gmail\)/i });
    fireEvent.click(notifyBtn);

    await waitFor(() => {
      expect(screen.getByText("Dispatch Finalized Schedule to Faculty via Institutional Gmail")).toBeInTheDocument();
    });

    // Verify cubicle advisory note is present in preview
    expect(screen.getByText(/Departmental Cubicle Advisory:/i)).toBeInTheDocument();
    expect(screen.getByText(/A physical printed copy of this finalized teaching schedule has been placed in your departmental faculty cubicle/i)).toBeInTheDocument();

    // Select specific faculty
    const select = screen.getByLabelText(/Target Faculty Member/i);
    fireEvent.change(select, { target: { value: "T-IT-001" } });

    // Submit dispatch
    const sendBtn = screen.getByRole("button", { name: /Send via Gmail/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/faculty-dispatch/send", expect.objectContaining({
        teacherId: "T-IT-001",
      }));
    });
  });
});
