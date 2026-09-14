import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { UserManagementPage } from "../UserManagementPage";
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

describe("UserManagementPage - Program Head Creation & One Program Head Per Program", () => {
  const initialUsers = [
    {
      id: "1",
      name: "Dr. Alan Turing",
      email: "turing@srcb.edu.ph",
      role: "program_head",
      program: "ITP",
      status: "Active",
      createdAt: "2026-01-20T08:00:00.000Z",
    },
    {
      id: "2",
      name: "Dr. Luca Pacioli",
      email: "pacioli@srcb.edu.ph",
      role: "program_head",
      program: "BAP",
      status: "Active",
      createdAt: "2026-01-21T08:00:00.000Z",
    },
    {
      id: "3",
      name: "Maria Santos",
      email: "santos@srcb.edu.ph",
      role: "teacher",
      program: "BSIT",
      status: "Active",
      createdAt: "2026-01-22T08:00:00.000Z",
    },
  ];

  const dbPrograms = [
    { code: "BAP", name: "Business Administration Program" },
    { code: "ITP", name: "Information Technology Program" },
    { code: "CJEP", name: "Criminal Justice Education Program" },
    { code: "TEP", name: "Teacher Education Program" },
    { code: "HMP", name: "Hospitality Management Program" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("userRole", "super_admin");
    localStorage.setItem("userName", "ICT Super Administrator");

    (api.get as any).mockImplementation((url: string) => {
      if (url === "/users") {
        return Promise.resolve({ data: { data: initialUsers } });
      }
      if (url === "/programs") {
        return Promise.resolve({ data: { data: dbPrograms } });
      }
      if (url === "/faculty") {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    (api.post as any).mockResolvedValue({
      data: { success: true, data: { id: "10", name: "New User", role: "program_head" } },
    });

    (api.put as any).mockResolvedValue({
      data: { success: true, data: { id: "1", name: "Updated User" } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Renders required Program field dynamically from database programs when selecting Program Head role", async () => {
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

    expect(await screen.findByText(/create institutional account/i)).toBeInTheDocument();

    const roleSelect = screen.getByLabelText(/assigned system role/i);
    fireEvent.change(roleSelect, { target: { value: "program_head" } });

    // Program dropdown appears and is populated
    const programSelect = screen.getByLabelText(/assigned academic program/i) as HTMLSelectElement;
    expect(programSelect).toBeInTheDocument();
    expect(programSelect).toHaveAttribute("required");

    const optionCodes = Array.from(programSelect.options).map((o) => o.value);
    expect(optionCodes).toContain("ITP");
    expect(optionCodes).toContain("BAP");
    expect(optionCodes).toContain("CJEP");
    expect(optionCodes).toContain("TEP");
    expect(optionCodes).toContain("HMP");
  });

  it("2. Blocks creation of duplicate Program Head for an already-assigned program (e.g. ITP)", async () => {
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

    // Fill form
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText(/school email/i), {
      target: { value: "ada.lovelace@srcb.edu.ph" },
    });

    const roleSelect = screen.getByLabelText(/assigned system role/i);
    fireEvent.change(roleSelect, { target: { value: "program_head" } });

    const programSelect = screen.getByLabelText(/assigned academic program/i);
    // Select ITP which already has Dr. Alan Turing
    fireEvent.change(programSelect, { target: { value: "ITP" } });

    const saveBtn = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(saveBtn);

    // Toast validation message appears
    await waitFor(() => {
      expect(screen.getByText(/this program already has a program head assigned/i)).toBeInTheDocument();
    });

    // API POST should NOT have been called
    expect(api.post).not.toHaveBeenCalled();
  });

  it("3. Successfully creates Program Head for an unassigned program (e.g. CJEP)", async () => {
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

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Sherlock" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Holmes" } });
    fireEvent.change(screen.getByLabelText(/school email/i), {
      target: { value: "criminology.head@srcb.edu.ph" },
    });

    const roleSelect = screen.getByLabelText(/assigned system role/i);
    fireEvent.change(roleSelect, { target: { value: "program_head" } });

    const programSelect = screen.getByLabelText(/assigned academic program/i);
    fireEvent.change(programSelect, { target: { value: "CJEP" } });

    const saveBtn = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/users",
        expect.objectContaining({
          name: "Sherlock Holmes",
          email: "criminology.head@srcb.edu.ph",
          role: "program_head",
          program: "CJEP",
        })
      );
    });
  });

  it("4. Allows editing an existing Program Head while keeping their assigned program", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <UserManagementPage />
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Find and click action menu for Alan Turing (ID 1)
    const turingRow = await screen.findByText("Dr. Alan Turing");
    expect(turingRow).toBeInTheDocument();

    const actionsBtn = screen.getByLabelText("Actions for Dr. Alan Turing");
    fireEvent.click(actionsBtn);

    const editBtn = await screen.findByRole("menuitem", { name: /edit profile/i });
    fireEvent.click(editBtn);

    expect(await screen.findByText("Edit User Profile")).toBeInTheDocument();

    // Change name, keep ITP program
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Alan" } });
    fireEvent.change(screen.getByLabelText(/middle name/i), { target: { value: "Mathison" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Turing" } });

    const saveBtn = screen.getByRole("button", { name: /update user profile/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/users/1",
        expect.objectContaining({
          name: "Alan Mathison Turing",
          role: "program_head",
          program: "ITP",
        })
      );
    });
  });

  it("5. Blocks editing a Program Head when changing to a program that already has another Head", async () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <UserManagementPage />
          </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    // Edit Alan Turing (ITP Head)
    const actionsBtn = await screen.findByLabelText("Actions for Dr. Alan Turing");
    fireEvent.click(actionsBtn);

    const editBtn = await screen.findByRole("menuitem", { name: /edit profile/i });
    fireEvent.click(editBtn);

    expect(await screen.findByText("Edit User Profile")).toBeInTheDocument();

    // Try changing to BAP (which already has Luca Pacioli)
    const programSelect = screen.getByLabelText(/assigned academic program/i);
    fireEvent.change(programSelect, { target: { value: "BAP" } });

    const saveBtn = screen.getByRole("button", { name: /update user profile/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/this program already has a program head assigned/i)).toBeInTheDocument();
    });

    expect(api.put).not.toHaveBeenCalled();
  });
});
