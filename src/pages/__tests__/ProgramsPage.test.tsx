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

  it("shows an empty state instead of demo program cards when no programs are returned", async () => {
    mockGet.mockResolvedValue({ data: { data: [] } });

    render(
      <ToastProvider>
        <ProgramsPage />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/no programs have been recorded yet/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/Bachelor of Science in Information Technology/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Bachelor of Science in Business Administration/i),
    ).not.toBeInTheDocument();
  });
});
