import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SubjectPalette } from "../SubjectPalette";

afterEach(() => {
  cleanup();
});

const mockSubjects = [
  {
    id: "sub-1",
    code: "CS 101",
    name: "Introduction to Computer Science",
    units: 3,
    lectureHours: 2,
    labHours: 3,
    isMajor: true,
    program: "BSIT",
  },
  {
    id: "sub-2",
    code: "CS 102",
    name: "Discrete Mathematics",
    units: 3,
    lectureHours: 3,
    labHours: 0,
    isMajor: true,
    program: "BSIT",
  },
  {
    id: "sub-3",
    code: "GE 101",
    name: "Understanding the Self",
    units: 3,
    lectureHours: 3,
    labHours: 0,
    isMajor: false,
    classification: "General Education",
    program: "ALL",
  },
];

describe("SubjectPalette Component", () => {
  it("renders subjects with proper heuristic duration tags according to institutional rules", () => {
    render(
      <SubjectPalette
        subjects={mockSubjects}
        isOpen={true}
        onToggleOpen={vi.fn()}
      />
    );

    expect(screen.getByText("CS 101")).toBeInTheDocument();
    expect(screen.getByText("Introduction to Computer Science")).toBeInTheDocument();

    // CS 101 has labHours > 0 -> 2h Lec / 3h Lab
    expect(screen.getByText("2h Lec / 3h Lab")).toBeInTheDocument();

    // CS 102 is major with 0 labHours -> 2h Lecture
    expect(screen.getByText("2h Lecture")).toBeInTheDocument();

    // GE 101 is non-major / Gen Ed -> 1.5h Standard
    expect(screen.getByText("1.5h Standard")).toBeInTheDocument();
  });

  it("renders exam duration tag when in exam mode", () => {
    render(
      <SubjectPalette
        subjects={mockSubjects}
        isExamMode={true}
        isOpen={true}
        onToggleOpen={vi.fn()}
      />
    );

    const examTags = screen.getAllByText("2h Exam");
    expect(examTags.length).toBe(3);
  });

  it("filters subjects by search query with clear button", () => {
    render(
      <SubjectPalette
        subjects={mockSubjects}
        isOpen={true}
        onToggleOpen={vi.fn()}
      />
    );

    const searchInput = screen.getByLabelText("Search curriculum subjects");
    fireEvent.change(searchInput, { target: { value: "Discrete" } });

    expect(screen.getByText("CS 102")).toBeInTheDocument();
    expect(screen.queryByText("CS 101")).not.toBeInTheDocument();
    expect(screen.queryByText("GE 101")).not.toBeInTheDocument();

    // Clear search
    const clearBtn = screen.getByTitle("Clear search");
    fireEvent.click(clearBtn);

    expect(screen.getByText("CS 101")).toBeInTheDocument();
    expect(screen.getByText("GE 101")).toBeInTheDocument();
  });

  it("filters subjects by classification pill (Majors vs Minor/Gen Ed)", () => {
    render(
      <SubjectPalette
        subjects={mockSubjects}
        isOpen={true}
        onToggleOpen={vi.fn()}
      />
    );

    const minorPill = screen.getByRole("button", { name: "Minor / Gen Ed" });
    fireEvent.click(minorPill);

    expect(screen.getByText("GE 101")).toBeInTheDocument();
    expect(screen.queryByText("CS 101")).not.toBeInTheDocument();
    expect(screen.queryByText("CS 102")).not.toBeInTheDocument();

    const majorsPill = screen.getByRole("button", { name: "Majors" });
    fireEvent.click(majorsPill);

    expect(screen.getByText("CS 101")).toBeInTheDocument();
    expect(screen.getByText("CS 102")).toBeInTheDocument();
    expect(screen.queryByText("GE 101")).not.toBeInTheDocument();
  });

  it("supports direct quick-add scheduling button for accessibility (Heuristic #7)", () => {
    const onSelect = vi.fn();
    render(
      <SubjectPalette
        subjects={mockSubjects}
        isOpen={true}
        onToggleOpen={vi.fn()}
        onSelectSubject={onSelect}
      />
    );

    const quickAddBtn = screen.getByLabelText("Schedule CS 101");
    fireEvent.click(quickAddBtn);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockSubjects[0]);
  });

  it("renders collapsed mode and triggers expand on click", () => {
    const onToggle = vi.fn();
    render(
      <SubjectPalette
        subjects={mockSubjects}
        isOpen={false}
        onToggleOpen={onToggle}
      />
    );

    const expandBtn = screen.getByLabelText("Expand Subject Palette");
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
