import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { UserManagementPage, ASSIGNED_ACADEMIC_PROGRAMS } from "../UserManagementPage";
import { api } from "../../data/apiClient";
import { ToastProvider } from "../../components/common/Toast";
import { NotificationProvider } from "../../contexts/NotificationContext";

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("UserManagementPage - Program Head Creation & Assigned Academic Programs", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("userRole", "super_admin");
    localStorage.setItem("userName", "ICT Super Administrator");

    (api.get as any).mockImplementation((url: string) => {
      if (url === "/users") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "USR-001",
                name: "Dr. Reyes",
                email: "reyes@srcb.edu.ph",
                role: "program_head",
                program: "ITP",
                status: "Active",
                createdAt: "2026-01-20T08:00:00.000Z",
              },
            ],
          },
        });
      }
      if (url === "/programs") {
        return Promise.resolve({
          data: {
            data: [
              { code: "BAP", name: "Business Administration Program" },
              { code: "ITP", name: "Information Technology Program" },
              { code: "CJEP", name: "Criminal Justice Education Program" },
              { code: "TEP", name: "Teacher Education Program" },
              { code: "HMP", name: "Hospitality Management Program" },
            ],
          },
        });
      }
      if (url === "/faculty") {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it("exports ASSIGNED_ACADEMIC_PROGRAMS containing the 5 specified programs", () => {
    expect(ASSIGNED_ACADEMIC_PROGRAMS).toEqual([
      { code: "BAP", name: "Business Administration Program" },
      { code: "ITP", name: "Information Technology Program" },
      { code: "CJEP", name: "Criminal Justice Education Program" },
      { code: "TEP", name: "Teacher Education Program" },
      { code: "HMP", name: "Hospitality Management Program" },
    ]);
  });

  it("renders Assigned Academic Program selection with all 5 programs when creating Program Head account", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <UserManagementPage />
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Click "Add User" button
    const addBtn = await screen.findByRole("button", { name: /add new user account/i });
    fireEvent.click(addBtn);

    // Modal opens
    expect(await screen.findByText(/create institutional account/i)).toBeInTheDocument();

    // Select role as Program Head
    const roleSelect = screen.getByLabelText(/assigned system role/i);
    fireEvent.change(roleSelect, { target: { value: "program_head" } });

    // Assigned Academic Program select should appear
    const programSelect = screen.getByLabelText(/assigned academic program/i) as HTMLSelectElement;
    expect(programSelect).toBeInTheDocument();

    const optionLabels = Array.from(programSelect.options).map((o) => o.text);
    expect(optionLabels).toContain("BAP - Business Administration Program");
    expect(optionLabels).toContain("ITP - Information Technology Program");
    expect(optionLabels).toContain("CJEP - Criminal Justice Education Program");
    expect(optionLabels).toContain("TEP - Teacher Education Program");
    expect(optionLabels).toContain("HMP - Hospitality Management Program");

    // Select BAP
    fireEvent.change(programSelect, { target: { value: "BAP" } });
    expect(programSelect.value).toBe("BAP");

    // Select CJEP
    fireEvent.change(programSelect, { target: { value: "CJEP" } });
    expect(programSelect.value).toBe("CJEP");
  });

  it("does not render link to faculty profile when creating teacher or program head accounts", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <UserManagementPage />
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    const addBtn = await screen.findByRole("button", { name: /add new user account/i });
    fireEvent.click(addBtn);

    expect(await screen.findByText("User Registration")).toBeInTheDocument();

    const roleSelect = screen.getByLabelText(/assigned system role/i);

    // Check teacher role
    fireEvent.change(roleSelect, { target: { value: "teacher" } });
    expect(screen.queryByLabelText(/link to faculty/i)).toBeNull();
    expect(screen.queryByText(/link to faculty profile/i)).toBeNull();

    // Check program_head role
    fireEvent.change(roleSelect, { target: { value: "program_head" } });
    expect(screen.queryByLabelText(/link to faculty/i)).toBeNull();
    expect(screen.queryByText(/link to faculty teaching profile/i)).toBeNull();
  });
});
