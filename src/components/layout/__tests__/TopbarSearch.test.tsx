import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Topbar } from "../Topbar";
import { ProgramProvider } from "../../../contexts/ProgramContext";
import { NotificationProvider } from "../../../contexts/NotificationContext";
import { api } from "../../../data/apiClient";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("Topbar Global Search", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/schedules") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "sched-1",
                subjectCode: "CC101",
                subject: "Intro to Computing",
                faculty: "Dr. Alan Turing",
                room: "COL-101",
                section: "BSIT 1-A",
                day: "Monday",
                time: "08:00 AM - 09:30 AM",
                modality: "Face-to-Face",
              },
            ],
          },
        });
      }
      if (url === "/subjects") {
        return Promise.resolve({
          data: {
            data: [
              {
                code: "IT201",
                name: "Database Systems",
                department: "Information Technology",
                units: 3,
                isMajor: true,
                instructor: "Ada Lovelace",
              },
            ],
          },
        });
      }
      if (url === "/faculty") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "fac-1",
                name: "Ada Lovelace",
                department: "Computer Science",
                status: "Full-Time",
              },
            ],
          },
        });
      }
      if (url === "/rooms") {
        return Promise.resolve({
          data: {
            data: [
              {
                number: "LAB-204",
                building: "College Building",
                type: "Computer Laboratory",
                capacity: 40,
              },
            ],
          },
        });
      }
      if (url === "/sections") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "sec-1",
                section: "BSIT 2-B",
                course: "BSIT",
                yearLevel: "2",
                students: 35,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  const renderTopbar = () => {
    return render(
      <BrowserRouter>
        <ProgramProvider>
          <NotificationProvider>
            <Topbar />
          </NotificationProvider>
        </ProgramProvider>
      </BrowserRouter>
    );
  };

  it("renders search input and triggers data prefetch on focus", async () => {
    renderTopbar();
    const searchInput = screen.getByPlaceholderText(/search schedules, subjects, faculty, rooms/i);
    expect(searchInput).toBeDefined();

    fireEvent.focus(searchInput);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/schedules");
      expect(api.get).toHaveBeenCalledWith("/subjects");
      expect(api.get).toHaveBeenCalledWith("/faculty");
    });
  });

  it("displays live matching dropdown results across categories", async () => {
    renderTopbar();
    const searchInput = screen.getByPlaceholderText(/search schedules, subjects, faculty, rooms/i);
    fireEvent.focus(searchInput);

    fireEvent.change(searchInput, { target: { value: "Ada" } });

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeDefined();
    });
  });

  it("navigates to relevant page when Enter is pressed", async () => {
    renderTopbar();
    const searchInput = screen.getByPlaceholderText(/search schedules, subjects, faculty, rooms/i);
    fireEvent.focus(searchInput);

    fireEvent.change(searchInput, { target: { value: "CC101" } });

    await waitFor(() => {
      expect(screen.getByText(/CC101 - Intro to Computing/i)).toBeDefined();
    });

    const form = searchInput.closest("form");
    if (form) {
      fireEvent.submit(form);
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/schedules?q="));
    }
  });

  it("clears search input when clear button is clicked", async () => {
    renderTopbar();
    const searchInput = screen.getByPlaceholderText(/search schedules, subjects, faculty, rooms/i) as HTMLInputElement;
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "TestQuery" } });
    expect(searchInput.value).toBe("TestQuery");

    const clearButton = screen.getByRole("button", { name: /clear search/i });
    fireEvent.click(clearButton);
    expect(searchInput.value).toBe("");
  });

  it("removes the top search bar when on the ICT page", () => {
    window.history.pushState({}, "ICT Page", "/users");
    render(
      <BrowserRouter>
        <ProgramProvider>
          <NotificationProvider>
            <Topbar title="User Management (ICT)" />
          </NotificationProvider>
        </ProgramProvider>
      </BrowserRouter>
    );

    const searchInput = screen.queryByPlaceholderText(/search schedules, subjects, faculty, rooms/i);
    expect(searchInput).toBeNull();
  });

  it("removes the top search bar when user role is super_admin (ICT) on any page including dashboard", () => {
    localStorage.setItem("userRole", "super_admin");
    window.history.pushState({}, "ICT Dashboard", "/dashboard");
    render(
      <BrowserRouter>
        <ProgramProvider>
          <NotificationProvider>
            <Topbar title="Dashboard" />
          </NotificationProvider>
        </ProgramProvider>
      </BrowserRouter>
    );

    const searchInput = screen.queryByPlaceholderText(/search schedules, subjects, faculty, rooms/i);
    expect(searchInput).toBeNull();
  });
});

