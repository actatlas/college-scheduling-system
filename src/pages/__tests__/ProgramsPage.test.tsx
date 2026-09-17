import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProgramsPage } from "../ProgramsPage";
import { ToastProvider } from "../../components/common/Toast";

const mockGet = vi.fn();

vi.mock("../../data/apiClient", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn().mockResolvedValue({ data: { data: {} } }),
    put: vi.fn().mockResolvedValue({ data: { data: {} } }),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

describe("ProgramsPage", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("shows an empty state when no programs are returned", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/programs") return Promise.resolve({ data: { data: [] } });
      if (url === "/program-majors") return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <ToastProvider>
        <ProgramsPage />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/no academic programs registered/i),
      ).toBeInTheDocument();
    });
  });

  it("renders programs and their associated majors", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/programs") {
        return Promise.resolve({
          data: {
            data: [
              { code: "BAP", name: "Business Administration Program", description: "Dept of Business" },
              { code: "TEP", name: "Teacher Education Program", description: "Dept of Education" },
            ],
          },
        });
      }
      if (url === "/program-majors") {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, code: "FM", name: "Financial Management", programCode: "BAP" },
              { id: 2, code: "MM", name: "Marketing Management", programCode: "BAP" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <ToastProvider>
        <ProgramsPage />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Business Administration Program/i)).toBeInTheDocument();
      expect(screen.getByText(/Teacher Education Program/i)).toBeInTheDocument();
      expect(screen.getByText(/Financial Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Marketing Management/i)).toBeInTheDocument();
    });
  });
});
