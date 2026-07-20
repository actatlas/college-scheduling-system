// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { DashboardPage } from "./pages/DashboardPage";
import { ProgramProvider } from "./contexts/ProgramContext";
import { ToastProvider } from "./components/common/Toast";

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("./data/mockApi", async () => {
  const actual =
    await vi.importActual<typeof import("./data/mockApi")>("./data/mockApi");

  return {
    ...actual,
    api: {
      get: vi.fn().mockImplementation((url: string) => {
        if (url.includes("/schedules/conflicts")) {
          return Promise.resolve({ data: { data: [] } });
        }
        if (url.includes("/schedules")) {
          return Promise.resolve({ data: { data: [] } });
        }
        return Promise.resolve({ data: { data: [] } });
      }),
      post: vi.fn().mockResolvedValue({ data: { data: {} } }),
      put: vi.fn().mockResolvedValue({ data: { data: {} } }),
      delete: vi.fn().mockResolvedValue({}),
    },
  };
});

describe("Scheduling system app", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the landing experience by default", async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /professional class scheduling for every academic department/i,
        ),
      ).toBeTruthy();
    });
  });

  it("shows teacher-specific dashboard content when a teacher role is active", async () => {
    window.localStorage.setItem("token", "test-token");
    window.localStorage.setItem("userRole", "teacher");
    window.localStorage.setItem("userName", "Ms. Santos");

    render(
      <ProgramProvider>
        <ToastProvider>
          <DashboardPage />
        </ToastProvider>
      </ProgramProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/teacher portal/i)).toBeTruthy();
    });
  });

  it("shows a friendly validation message when sign-in is attempted with missing details", async () => {
    const { LoginPage } = await import("./pages/LoginPage");

    render(
      <ToastProvider>
        <LoginPage />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/please enter your email and password/i),
      ).toBeTruthy();
    });
  });
});
