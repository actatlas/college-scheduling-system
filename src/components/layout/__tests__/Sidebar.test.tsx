import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Sidebar } from "../Sidebar";

describe("Sidebar Navigation & Role-Based Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("removes the 'New Schedule' (Add Schedule) CTA button in the sidebar for admin", () => {
    localStorage.setItem("userRole", "admin");

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const newSchedBtn = screen.queryByRole("button", { name: /new schedule/i });
    expect(newSchedBtn).toBeNull();
  });

  it("does not render the 'New Schedule' CTA button for super_admin (ICT)", () => {
    localStorage.setItem("userRole", "super_admin");

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const newSchedBtn = screen.queryByRole("button", { name: /new schedule/i });
    expect(newSchedBtn).toBeNull();
  });

  it("renders the primary navigation links for admin", () => {
    localStorage.setItem("userRole", "admin");

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getAllByText("Dashboard")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Class Schedules")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Faculty Directory")[0]).toBeInTheDocument();
  });
});
