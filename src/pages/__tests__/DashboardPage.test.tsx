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

describe("DashboardPage - Clean Real-Time Data", () => {
  it("renders clean state without dummy data like Turing or fake conflicts when data is empty", async () => {
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
    expect(screen.queryByText(/Dr. Alan Turing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prof. Ada Lovelace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/LAB-402/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/All Systems Nominal/i)).toBeInTheDocument();
    expect(await screen.findByText(/No Faculty Assigned/i)).toBeInTheDocument();
  });
});
