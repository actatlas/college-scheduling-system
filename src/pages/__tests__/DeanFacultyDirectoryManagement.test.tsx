import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { FacultyPage } from "../FacultyPage";
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

describe("Dean Faculty Directory Management - Add Teacher", () => {
  const initialFaculty = [
    {
      id: "FAC-001",
      name: "Prof. Ada Lovelace",
      firstName: "Ada",
      lastName: "Lovelace",
      employeeNumber: "EMP-001",
      department: "Information Technology Program",
      email: "ada@srcb.edu.ph",
      phone: "09171234567",
      status: "Full-Time",
      facultyType: "Full-Time",
      maxLoadHours: 24,
      availability: "Monday-Friday: 08:00-17:00",
      programs: ["BSIT"],
      subjects: ["IT101"],
    },
  ];

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    // Set Dean credentials (admin role represents Dean of Student Affairs / Dean of College)
    window.localStorage.setItem("userRole", "admin");
    window.localStorage.setItem("userName", "Dean of College");
    window.localStorage.setItem("userProgram", "BSIT");

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/faculty") {
        return Promise.resolve({ data: { data: initialFaculty } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    vi.mocked(api.post).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "FAC-002",
          name: "Dr. Grace Hopper",
          department: "Information Technology Program",
          status: "Full-Time",
        },
      },
    });

    vi.mocked(api.put).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "FAC-001",
          name: "Prof. Ada King Lovelace",
          department: "Information Technology Program",
          status: "Full-Time",
        },
      },
    });
  });

  it("1. Renders the 'Add Teacher' button for the Dean on the Faculty Directory page", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <ProgramProvider>
              <FacultyPage />
            </ProgramProvider>
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // The Dean should see the Add Teacher action button in the PageHeader
    const addTeacherBtn = await screen.findByRole("button", { name: /Add new teacher|Add Teacher/i });
    expect(addTeacherBtn).toBeInTheDocument();
    expect(addTeacherBtn).toHaveTextContent(/Add Teacher/i);
  });

  it("2. Allows the Dean to open the modal, input teacher details, and register a new teacher", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <ProgramProvider>
              <FacultyPage />
            </ProgramProvider>
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    const addTeacherBtn = await screen.findByRole("button", { name: /Add new teacher|Add Teacher/i });
    fireEvent.click(addTeacherBtn);

    // The modal opens with Register Teacher title
    expect(await screen.findByRole("heading", { name: /Register Teacher/i })).toBeInTheDocument();
    expect(screen.getByText(/Configure teacher details, department, employment status, and weekly limits./i)).toBeInTheDocument();

    // Fill in First Name and Last Name
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    fireEvent.change(firstNameInput, { target: { value: "Grace" } });
    fireEvent.change(lastNameInput, { target: { value: "Hopper" } });

    // Fill in Email and Phone
    const emailInput = screen.getByLabelText(/Email Address/i);
    const phoneInput = screen.getByLabelText(/Phone Contact/i);
    fireEvent.change(emailInput, { target: { value: "hopper@srcb.edu.ph" } });
    fireEvent.change(phoneInput, { target: { value: "09181234567" } });

    // Click Register Teacher submit button
    const submitBtn = screen.getByRole("button", { name: /Register Teacher/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/faculty",
        expect.objectContaining({
          name: "Grace Hopper",
          email: "hopper@srcb.edu.ph",
          phone: "09181234567",
          status: "Full-Time",
        })
      );
    });
  });

  it("3. Allows the Dean to edit an existing teacher profile", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <ProgramProvider>
              <FacultyPage />
            </ProgramProvider>
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Open row actions dropdown for Prof. Ada Lovelace
    const actionToggleBtn = await screen.findByLabelText(/Actions for Prof. Ada Lovelace/i);
    fireEvent.click(actionToggleBtn);

    // Click Edit Profile
    const editBtn = await screen.findByRole("menuitem", { name: /Edit Profile/i });
    fireEvent.click(editBtn);

    // Modal opens in Edit mode
    expect(await screen.findByRole("heading", { name: /Edit Teacher Profile/i })).toBeInTheDocument();
    const phoneInput = screen.getByLabelText(/Phone Contact/i);
    fireEvent.change(phoneInput, { target: { value: "09199887766" } });

    // Save
    const updateBtn = screen.getByRole("button", { name: /Update Profile/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/faculty/FAC-001",
        expect.objectContaining({
          name: "Prof. Ada Lovelace",
          phone: "09199887766",
        })
      );
    });
  });
});
