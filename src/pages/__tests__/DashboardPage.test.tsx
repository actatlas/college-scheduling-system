import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "../DashboardPage";
import { ProgramProvider } from "../../contexts/ProgramContext";
import { ToastProvider } from "../../components/common/Toast";

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe("DashboardPage - Clean Real-Time Data & Daily Operations", () => {
  it("renders daily operations dashboard with status badges and clean nominal state when empty", async () => {
    window.localStorage.setItem("userRole", "admin");
    window.localStorage.setItem("userName", "Admin User");

    render(
      <MemoryRouter>
        <ToastProvider>
          <ProgramProvider>
            <DashboardPage />
          </ProgramProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/College Academic Scheduling Dashboard/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Today's Schedule/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Total Classes Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Currently Ongoing/i)).toBeInTheDocument();
    expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dr. Alan Turing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prof. Ada Lovelace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/LAB-402/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/All Systems Nominal/i)).toBeInTheDocument();
    expect(screen.getByText(/No classes scheduled for today/i)).toBeInTheDocument();
  });
});
