import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "../Modal";
import { ConfirmModal } from "../ConfirmModal";

describe("Modal - Usability Heuristics & Accessibility", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("closes when the backdrop is clicked (User Control & Freedom - Heuristic #3)", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen={true} title="Test modal" onClose={onClose}>
        <div>Modal body</div>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the Escape key is pressed (Heuristic #3)", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen={true} title="Test modal" onClose={onClose}>
        <div>Modal body</div>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the close button is clicked (Heuristic #3)", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen={true} title="Test modal" onClose={onClose}>
        <div>Modal body</div>
      </Modal>,
    );

    const closeBtn = screen.getByRole("button", { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render hardcoded 'Registrar action' eyebrow by default (Consistency & Real World - Heuristic #2, #4)", () => {
    render(
      <Modal isOpen={true} title="User Account Creation" onClose={vi.fn()}>
        <div>Modal body</div>
      </Modal>,
    );

    expect(screen.queryByText(/registrar action/i)).toBeNull();
  });

  it("renders custom contextual eyebrow when provided", () => {
    render(
      <Modal
        isOpen={true}
        title="User Account Creation"
        eyebrow="User Registration"
        onClose={vi.fn()}
      >
        <div>Modal body</div>
      </Modal>,
    );

    expect(screen.getByText("User Registration")).toBeInTheDocument();
  });

  it("locks body scroll on open and restores on unmount (Heuristic #3)", () => {
    const { unmount } = render(
      <Modal isOpen={true} title="Test modal" onClose={vi.fn()}>
        <div>Modal body</div>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("links description via aria-describedby for accessibility (Heuristic #6)", () => {
    render(
      <Modal
        isOpen={true}
        title="Accessible Modal"
        description="Detailed purpose description"
        onClose={vi.fn()}
      >
        <div>Body content</div>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-describedby", "modal-description");
    expect(screen.getByText("Detailed purpose description")).toHaveAttribute("id", "modal-description");
  });

  it("renders footer outside the scrollable body in .modal-card__footer when provided", () => {
    render(
      <Modal
        isOpen={true}
        title="Modal with Footer"
        onClose={vi.fn()}
        footer={<button type="button">Pinned Footer Action</button>}
      >
        <div>Body content</div>
      </Modal>,
    );

    const footerElement = screen.getByRole("dialog").querySelector(".modal-card__footer");
    expect(footerElement).toBeInTheDocument();
    expect(footerElement).toHaveTextContent("Pinned Footer Action");
  });

  it("applies accurate size classes (sm, md, lg, xl)", () => {
    const { rerender } = render(
      <Modal isOpen={true} title="Sized Modal" size="sm" onClose={vi.fn()}>
        <div>Content</div>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("modal-card--sm");

    rerender(
      <Modal isOpen={true} title="Sized Modal" size="md" onClose={vi.fn()}>
        <div>Content</div>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("modal-card--md");

    rerender(
      <Modal isOpen={true} title="Sized Modal" size="lg" onClose={vi.fn()}>
        <div>Content</div>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("modal-card--lg");

    rerender(
      <Modal isOpen={true} title="Sized Modal" size="xl" onClose={vi.fn()}>
        <div>Content</div>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("modal-card--xl");
  });

  it("traps focus when Tab is pressed at the boundary elements", () => {
    render(
      <Modal isOpen={true} title="Focus Trap Modal" onClose={vi.fn()}>
        <input data-testid="first-input" placeholder="First" />
        <button data-testid="second-button" type="button">Second</button>
      </Modal>,
    );

    const closeBtn = screen.getByRole("button", { name: /close dialog/i });
    const secondButton = screen.getByTestId("second-button");

    // Close button is the first focusable element in header
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab on first element should wrap to last element (secondButton)
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(secondButton);

    // Tab on last element should wrap to first element (closeBtn)
    secondButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: false });
    expect(document.activeElement).toBe(closeBtn);
  });

  it("preserves input focus during continuous typing and parent re-renders", () => {
    let parentRenderCount = 0;
    function FormModalWrapper() {
      const [val, setVal] = useState("");
      parentRenderCount++;

      return (
        <div>
          <button data-testid="outside-trigger" type="button">Trigger</button>
          <Modal
            isOpen={true}
            title="Typing Test"
            // Inline function recreated on every keystroke/render
            onClose={() => {}}
          >
            <input
              data-testid="modal-typing-input"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
          </Modal>
        </div>
      );
    }

    render(<FormModalWrapper />);
    const input = screen.getByTestId("modal-typing-input");
    input.focus();
    expect(document.activeElement).toBe(input);

    // First keystroke
    fireEvent.change(input, { target: { value: "A" } });
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue("A");

    // Second keystroke
    fireEvent.change(input, { target: { value: "AB" } });
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue("AB");

    // Third keystroke
    fireEvent.change(input, { target: { value: "ABC" } });
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue("ABC");

    expect(parentRenderCount).toBeGreaterThan(1);
  });
});

describe("ConfirmModal - Usability Heuristics", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("renders destructive action eyebrow and danger styling for danger variant (Error Prevention - Heuristic #5)", () => {
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete User"
        message="Are you sure you want to permanently delete this user?"
        variant="danger"
        confirmLabel="Delete User"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Destructive Action")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete User" })).toBeInTheDocument();
  });

  it("disables buttons and shows loading state during submission (Visibility of Status - Heuristic #1)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm Operation"
        variant="primary"
        loading={true}
        confirmLabel="Confirm"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const confirmBtn = screen.getByRole("button", { name: /processing/i });
    expect(confirmBtn).toBeDisabled();

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    expect(cancelBtn).toBeDisabled();
  });
});
