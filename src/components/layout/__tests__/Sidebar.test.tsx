import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Sidebar } from "../Sidebar";

describe("Sidebar Navigation & Role-Based Actions", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
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
    expect(screen.getAllByText("Exam Schedules")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Faculty Directory")[0]).toBeInTheDocument();
  });

  it("does not render Class Schedules or Exam Schedules for super_admin (ICT Governance)", () => {
    localStorage.setItem("userRole", "super_admin");

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getAllByText("Dashboard")[0]).toBeInTheDocument();
    expect(screen.queryByText("Class Schedules")).toBeNull();
    expect(screen.queryByText("Exam Schedules")).toBeNull();
    expect(screen.getByText("User Accounts")).toBeInTheDocument();
    expect(screen.getByText("System Logs")).toBeInTheDocument();
  });
});
