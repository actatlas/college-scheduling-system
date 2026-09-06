import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ProgramProvider } from "../../contexts/ProgramContext";
import ToastProvider from "../../components/common/Toast";
import { api } from "../../data/apiClient";

// @vitest-environment jsdom

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { CoursesPage } from "../CoursesPage";

describe("CoursesPage - Program Major Subjects & Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("userRole", "admin");
  });

  it("shows an empty state when the API returns no subject data", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

    render(
      <BrowserRouter>
        <ProgramProvider>
          <ToastProvider>
            <CoursesPage />
          </ToastProvider>
        </ProgramProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No subjects available for this program yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders major subjects with explicit Edit and Delete options in the Actions column", async () => {
    const sampleSubjects = [
      {
        code: "IT101",
        name: "Computer Programming 1",
        units: 3,
        lectureHours: 2,
        labHours: 3,
        semester: "1st Semester",
        department: "Information Technology Program",
        program: "ITP",
        isMajor: true,
        instructor: "Mr. Juan Dela Cruz",
        instructorId: "FAC-001",
      },
      {
        code: "BA101",
        name: "Principles of Management",
        units: 3,
        lectureHours: 3,
        labHours: 0,
        semester: "1st Semester",
        department: "Business Administration Program",
        program: "BAP",
        isMajor: true,
        instructor: "Prof. Mary Cruz",
        instructorId: "FAC-004",
      },
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/subjects") return Promise.resolve({ data: { data: sampleSubjects } });
      if (url === "/courses") return Promise.resolve({ data: { data: [] } });
      if (url === "/faculty") return Promise.resolve({ data: { data: [] } });
      if (url === "/programs") return Promise.resolve({ data: { data: [] } });
      if (url === "/sections") return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <BrowserRouter>
        <ProgramProvider>
          <ToastProvider>
            <CoursesPage />
          </ToastProvider>
        </ProgramProvider>
      </BrowserRouter>
    );

    // Verify subjects appear
    expect(await screen.findByText("IT101")).toBeInTheDocument();
    expect(screen.getByText("Computer Programming 1")).toBeInTheDocument();
    expect(screen.getByText("BA101")).toBeInTheDocument();
    expect(screen.getByText("Principles of Management")).toBeInTheDocument();

    // Verify Edit buttons exist in the Actions column
    const editButtons = screen.getAllByRole("button", { name: /^edit\s/i });
    expect(editButtons.length).toBe(2);

    // Verify Delete buttons exist in the Actions column
    const deleteButtons = screen.getAllByRole("button", { name: /^delete\s/i });
    expect(deleteButtons.length).toBe(2);

    // Clicking Edit opens the Edit Modal
    fireEvent.click(editButtons[0]);
    expect(await screen.findByText(/Edit Major Subject \(IT101\)/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Computer Programming 1")).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Clicking Delete opens the Confirm Delete modal
    fireEvent.click(deleteButtons[0]);
    expect(await screen.findByText(/Delete Major Subject IT101\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Yes, Delete Major Subject/i })).toBeInTheDocument();
  });
});
