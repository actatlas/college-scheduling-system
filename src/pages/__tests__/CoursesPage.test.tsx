import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProgramProvider } from "../../contexts/ProgramContext";
import ToastProvider from "../../components/common/Toast";

// @vitest-environment jsdom

// Mock axios used by apiClient (provide default export)
vi.mock("axios", () => ({
  default: {
    create: () => ({
      get: vi.fn().mockResolvedValue({ data: { data: [] } }),
      post: vi.fn().mockResolvedValue({ data: { data: {} } }),
      put: vi.fn().mockResolvedValue({ data: { data: {} } }),
      delete: vi.fn().mockResolvedValue({}),
      interceptors: { request: { use: () => {} } },
    }),
  },
}));

import { CoursesPage } from "../CoursesPage";

describe("CoursesPage", () => {
  it("shows an empty state when the API returns no subject data", async () => {
    render(
      <ProgramProvider>
        <ToastProvider>
          <CoursesPage />
        </ToastProvider>
      </ProgramProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No subjects available for this program yet/i),
      ).toBeInTheDocument();
    });
  });
});
