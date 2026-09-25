import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { SettingsPage } from "../SettingsPage";
import { ToastProvider } from "../../components/common/Toast";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock("../../data/apiClient", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

describe("Privilege & Delegation Management System (Admin Control)", () => {
  const mockDelegations = [
    {
      userId: 3,
      userName: "Dr. Alan Turing",
      userEmail: "ithead@srcb.edu.ph",
      programCode: "BSIT",
      programName: "Information Technology Program",
      grantedPrivileges: ["MANAGE_EXAM_SCHEDULE", "MANAGE_CLASS_SCHEDULE", "ROOM_REALLOCATION"],
      hasExamSchedulePrivilege: true,
      hasClassSchedulePrivilege: true,
      hasRoomReallocationPrivilege: true,
    },
    {
      userId: 4,
      userName: "Dr. Peter Drucker",
      userEmail: "businesshead@srcb.edu.ph",
      programCode: "BSBA",
      programName: "Business Administration Program",
      grantedPrivileges: ["MANAGE_CLASS_SCHEDULE"],
      hasExamSchedulePrivilege: false,
      hasClassSchedulePrivilege: true,
      hasRoomReallocationPrivilege: false,
    },
    {
      userId: 5,
      userName: "Dr. August Vollmer",
      userEmail: "crimhead@srcb.edu.ph",
      programCode: "BSCRIM",
      programName: "Criminal Justice Education Program",
      grantedPrivileges: ["MANAGE_CLASS_SCHEDULE"],
      hasExamSchedulePrivilege: false,
      hasClassSchedulePrivilege: true,
      hasRoomReallocationPrivilege: false,
    },
    {
      userId: 6,
      userName: "Prof. Georges Escoffier",
      userEmail: "hmhead@srcb.edu.ph",
      programCode: "BSHM",
      programName: "Hospitality Management Program",
      grantedPrivileges: ["MANAGE_CLASS_SCHEDULE"],
      hasExamSchedulePrivilege: false,
      hasClassSchedulePrivilege: true,
      hasRoomReallocationPrivilege: false,
    },
    {
      userId: 7,
      userName: "Dr. Maria Montessori",
      userEmail: "educhead@srcb.edu.ph",
      programCode: "TEP",
      programName: "Teacher Education Program",
      grantedPrivileges: ["MANAGE_CLASS_SCHEDULE"],
      hasExamSchedulePrivilege: false,
      hasClassSchedulePrivilege: true,
      hasRoomReallocationPrivilege: false,
    },
  ];

  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();
    localStorage.clear();
    localStorage.setItem("userRole", "admin");
    localStorage.setItem("userName", "Dean of Student Affairs");

    mockGet.mockImplementation((url: string) => {
      if (url === "/terms/settings") {
        return Promise.resolve({
          data: {
            data: {
              institutionName: "St. Rita's College of Balingasag",
              institutionCode: "SRCB",
              academicYear: "2026-2027",
              semester: "1st Semester",
            },
          },
        });
      }
      if (url === "/delegations") {
        return Promise.resolve({ data: { data: mockDelegations } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    mockPost.mockResolvedValue({
      data: {
        message: "Delegated privileges updated successfully.",
        data: { userId: 4, programCode: "BSBA", grantedPrivileges: ["MANAGE_EXAM_SCHEDULE", "MANAGE_CLASS_SCHEDULE"] },
      },
    });
  });

  it("1. Renders the Delegated Privileges Governance panel with all 5 Program Heads", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <SettingsPage />
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Delegated Privileges Management")).toBeInTheDocument();
    });

    // Check all 5 program heads appear in table
    expect(screen.getByText("Dr. Alan Turing")).toBeInTheDocument();
    expect(screen.getByText("Dr. Peter Drucker")).toBeInTheDocument();
    expect(screen.getByText("Dr. August Vollmer")).toBeInTheDocument();
    expect(screen.getByText("Prof. Georges Escoffier")).toBeInTheDocument();
    expect(screen.getByText("Dr. Maria Montessori")).toBeInTheDocument();

    // Check program codes appear
    expect(screen.getByText("BSIT")).toBeInTheDocument();
    expect(screen.getByText("BSBA")).toBeInTheDocument();
    expect(screen.getByText("BSCRIM")).toBeInTheDocument();
    expect(screen.getByText("BSHM")).toBeInTheDocument();
    expect(screen.getByText("TEP")).toBeInTheDocument();

    // Dr. Alan Turing has AUTHORIZED status; Dr. Drucker has LOCKED / REVOKED
    expect(screen.getByText("AUTHORIZED")).toBeInTheDocument();
    expect(screen.getAllByText("LOCKED / REVOKED").length).toBe(4);
  });

  it("2. Opens the Grant / Revoke modal for a Program Head and updates privileges via API", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <SettingsPage />
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Dr. Peter Drucker")).toBeInTheDocument();
    });

    // Click Grant / Revoke on Dr. Peter Drucker (index 1)
    const actionButtons = screen.getAllByRole("button", { name: /Grant \/ Revoke/i });
    fireEvent.click(actionButtons[1]);

    await waitFor(() => {
      expect(screen.getByText("Manage Delegated Privileges — Dr. Peter Drucker")).toBeInTheDocument();
    });

    // Verify modal is locked to target program (BSBA)
    expect(screen.getByText(/Assigned Program:/i)).toBeInTheDocument();
    expect(screen.getAllByText("BSBA").length).toBeGreaterThanOrEqual(1);

    // Toggle Authorize Exam Scheduling checkbox
    const examCheckbox = screen.getByLabelText(/Authorize Exam Scheduling & Room Allocation/i);
    fireEvent.click(examCheckbox);

    // Save privileges
    const saveBtn = screen.getByRole("button", { name: /Save Privileges/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/delegations", expect.objectContaining({
        userId: 4,
        programCode: "BSBA",
        privileges: expect.arrayContaining(["MANAGE_EXAM_SCHEDULE"]),
      }));
    });
  });
});
