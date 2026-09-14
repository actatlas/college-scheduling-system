import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { SystemLogsPage } from "../SystemLogsPage";
import { api } from "../../data/apiClient";

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../utils/alerts", () => ({
  showToast: vi.fn(),
  showSuccessAlert: vi.fn(),
  showErrorAlert: vi.fn(),
  showWarningAlert: vi.fn(),
  showConfirmDialog: vi.fn().mockResolvedValue(true),
  alerts: {
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
  },
}));

const mockLogs = [
  {
    id: 1,
    userId: 1,
    userName: "ICT Super Admin",
    userEmail: "superadmin@srcb.edu.ph",
    role: "super_admin",
    module: "User Management",
    action: "Created User Account",
    description: "Created new Program Head account for IT Program.",
    targetId: "12",
    targetType: "User",
    status: "Success",
    ipAddress: "127.0.0.1",
    details: { program: "ITP" },
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    userId: null,
    userName: "unauthenticated",
    userEmail: "hacker@test.com",
    role: "unauthenticated",
    module: "Authentication",
    action: "Failed Login Attempt",
    description: "Failed login attempt for identifier hacker@test.com.",
    targetId: null,
    targetType: null,
    status: "Failed",
    ipAddress: "192.168.1.1",
    details: null,
    createdAt: new Date().toISOString(),
  },
];

describe("SystemLogsPage (ICT Super Admin Exclusive)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("userRole", "super_admin");
    localStorage.setItem("token", "fake-token");

    (api.get as any).mockResolvedValue({
      data: {
        data: mockLogs,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Renders System Logs audit trail page for Super Admin", async () => {
    (api.get as any).mockResolvedValue({
      data: {
        data: mockLogs,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      },
    });

    render(
      <BrowserRouter>
        <SystemLogsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/System Audit Logs/i)).toBeInTheDocument();
    expect(screen.getByText(/ICT Governance & Audit/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Created User Account")).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getAllByText(/Failed Login Attempt/i).length).toBeGreaterThan(0);
  });

  it("2. Filters logs by Search and Module", async () => {
    render(
      <BrowserRouter>
        <SystemLogsPage />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search description, user, action, target.../i);
    fireEvent.change(searchInput, { target: { value: "hacker" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/system-logs",
        expect.objectContaining({
          params: expect.objectContaining({
            search: "hacker",
          }),
        })
      );
    });
  });

  it("3. Displays 403 / Access Restricted for non-Super Admin roles", async () => {
    localStorage.setItem("userRole", "admin");

    render(
      <BrowserRouter>
        <SystemLogsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/403 — Unauthorized Access/i)).toBeInTheDocument();
    expect(screen.getByText(/restricted exclusively to the ICT Super Administrator/i)).toBeInTheDocument();
  });
});
