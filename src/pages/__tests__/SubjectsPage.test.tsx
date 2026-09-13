import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ProgramProvider } from "../../contexts/ProgramContext";
import { AcademicPeriodProvider } from "../../contexts/AcademicPeriodContext";
import ToastProvider from "../../components/common/Toast";
import { api } from "../../data/apiClient";
import { SubjectsPage } from "../SubjectsPage";

// @vitest-environment jsdom

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("SubjectsPage - Add Subject without Default Instructor", () => {
  const sampleSubjects = [
    {
      code: "IT101",
      name: "Computer Programming 1",
      units: 3,
      lectureHours: 2,
      labHours: 3,
      semester: "1st Semester",
      department: "Information Technology",
      program: "BSIT",
      courseCode: "BSIT",
      isMajor: true,
      instructor: "Unassigned",
      instructorId: "",
    },
  ];

  const sampleFaculty = [
    {
      id: "FAC-001",
      name: "Prof. Alan Turing",
      department: "BSIT",
      status: "Full-Time",
    },
  ];

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("userRole", "admin");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/subjects") return Promise.resolve({ data: { data: sampleSubjects } });
      if (url === "/courses") return Promise.resolve({ data: { data: [{ code: "BSIT", name: "BS Information Technology", programCode: "BSIT" }] } });
      if (url === "/programs") return Promise.resolve({ data: { data: [{ code: "BSIT", name: "BS Information Technology" }] } });
      if (url === "/faculty") return Promise.resolve({ data: { data: sampleFaculty } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("does not render Default Instructor selection when adding a new subject", async () => {
    render(
      <BrowserRouter>
        <ProgramProvider>
          <AcademicPeriodProvider>
            <ToastProvider>
              <SubjectsPage />
            </ToastProvider>
          </AcademicPeriodProvider>
        </ProgramProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText("IT101")).toBeInTheDocument();

    // Click Add Subject
    const addButton = screen.getByRole("button", { name: /Add Subject/i });
    fireEvent.click(addButton);

    // Modal opens
    expect(screen.getByText("Register New Subject")).toBeInTheDocument();

    // Verify Default Instructor / Assigned Instructor select is NOT present in the add form
    expect(screen.queryByLabelText(/Default Instructor/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Assigned Instructor/i)).not.toBeInTheDocument();
  });

  it("renders Assigned Instructor selection when editing an existing subject", async () => {
    render(
      <BrowserRouter>
        <ProgramProvider>
          <AcademicPeriodProvider>
            <ToastProvider>
              <SubjectsPage />
            </ToastProvider>
          </AcademicPeriodProvider>
        </ProgramProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText("IT101")).toBeInTheDocument();

    // Click Edit button for IT101
    const editButton = screen.getAllByRole("button", { name: /Edit IT101/i })[0];
    fireEvent.click(editButton);

    // Modal opens in Edit mode
    expect(screen.getByText("Edit Academic Subject")).toBeInTheDocument();

    // Verify Assigned Instructor field is present in edit mode
    expect(screen.getByLabelText(/Assigned Instructor/i)).toBeInTheDocument();
  });

  it("renders semester selector, uppercase code formatting, and component structure in Add Subject modal", async () => {
    render(
      <BrowserRouter>
        <ProgramProvider>
          <AcademicPeriodProvider>
            <ToastProvider>
              <SubjectsPage />
            </ToastProvider>
          </AcademicPeriodProvider>
        </ProgramProvider>
      </BrowserRouter>
    );

    expect(await screen.findByText("IT101")).toBeInTheDocument();

    // Click Add Subject
    const addButton = screen.getByRole("button", { name: /Add Subject/i });
    fireEvent.click(addButton);

    // Verify Academic Semester selector is present
    const semesterSelect = screen.getByLabelText(/Academic Semester/i);
    expect(semesterSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1st Semester" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "2nd Semester" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Summer" })).toBeInTheDocument();

    // Verify Subject Code input auto-uppercases
    const codeInput = screen.getByLabelText(/Subject Code/i) as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: "ge102" } });
    expect(codeInput.value).toBe("GE102");

    // Verify Component selection (Lecture Only, Lab Only, Lecture & Lab)
    const componentSelect = screen.getByLabelText(/Class Component & Institutional Hours/i);
    expect(componentSelect).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Major Lecture Only \(2 Hours per session\)/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Major Laboratory Only \(3 Hours per session\)/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Major Lecture & Laboratory \(2h Lec \+ 3h Lab\)/i })).toBeInTheDocument();

    // Verify Live Timetable Preview indicates 2 hrs for default Major Lecture
    expect(screen.getByText(/Timetable Session Duration:/i)).toBeInTheDocument();
    expect(screen.getByText("Major Lec: 2 hrs session")).toBeInTheDocument();

    // Switch component to Laboratory Only (3 Hours)
    fireEvent.change(componentSelect, { target: { value: "LabOnly" } });
    expect(screen.getByText("Major Lab: 3 hrs session")).toBeInTheDocument();

    // Switch classification to Minor / General Education
    const classSelect = screen.getByLabelText(/Subject Classification/i);
    fireEvent.change(classSelect, { target: { value: "false" } });

    // Verify Universal Minor banner and 1.5h duration preview
    expect(screen.getByText(/Universal Minor \/ Gen Ed Subject: Scheduled in 1\.5h sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/Minor \/ Gen Ed: 1 hr 30 mins \(1\.5h session\)/i)).toBeInTheDocument();
  });
});

