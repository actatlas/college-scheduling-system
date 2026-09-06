import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ProgramProvider, useProgramContext } from "../ProgramContext";
import { storage } from "../../data/storage";
import { api } from "../../data/apiClient";
import type { ReactNode } from "react";

vi.mock("../../data/apiClient", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("ProgramContext & Real Programs Filtering", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("storage.getPrograms filters out non-included legacy program codes", () => {
    // Seed with legacy dirty data containing extra degree courses
    localStorage.setItem(
      "srcb_programs",
      JSON.stringify([
        { code: "BAP", name: "Business Administration Program" },
        { code: "ITP", name: "Information Technology Program" },
        { code: "BSIT", name: "Bachelor of Science in Information Technology" },
        { code: "BSBA", name: "Bachelor of Science in Business Administration" },
        { code: "CJEP", name: "Criminal Justice Education Program" },
        { code: "TEP", name: "Teacher Education Program" },
        { code: "HMP", name: "Hospitality Management Program" },
        { code: "BSCrim", name: "Bachelor of Science in Criminology" },
      ])
    );

    const programs = storage.getPrograms();
    const codes = programs.map((p: any) => p.code);

    expect(codes).toContain("BAP");
    expect(codes).toContain("ITP");
    expect(codes).toContain("CJEP");
    expect(codes).toContain("TEP");
    expect(codes).toContain("HMP");
    expect(codes).not.toContain("BSIT");
    expect(codes).not.toContain("BSBA");
    expect(codes).not.toContain("BSCrim");
    expect(programs.length).toBe(5);
  });

  it("loads only real programs into ProgramContext options", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [
          { code: "BAP", name: "Business Administration Program", focus: "test" },
          { code: "CJEP", name: "Criminal Justice Education Program", focus: null },
          { code: "HMP", name: "Hospitality Management Program", focus: null },
          { code: "ITP", name: "Information Technology Program", focus: "ITP" },
          { code: "TEP", name: "Teacher Education Program", focus: null },
        ],
      },
    } as any);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ProgramProvider>{children}</ProgramProvider>
    );

    const { result } = renderHook(() => useProgramContext(), { wrapper });

    await waitFor(() => {
      const keys = result.current.programOptions.map((o) => o.key);
      expect(keys).toEqual(["ALL", "BAP", "CJEP", "HMP", "ITP", "TEP"]);
    });
  });

  it("resets selectedProgram to ALL if saved program was an invalid non-program", async () => {
    localStorage.setItem("selectedProgram", "BSIT");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ProgramProvider>{children}</ProgramProvider>
    );

    const { result } = renderHook(() => useProgramContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedProgramKey).toBe("ALL");
    });
  });
});
