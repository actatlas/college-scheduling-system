import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("closes when the backdrop is clicked", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen={true} title="Test modal" onClose={onClose}>
        <div>Modal body</div>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
