// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import App from "./App";

describe("Scheduling system app", () => {
  beforeEach(() => {
    window.localStorage.setItem("token", "test-token");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the college scheduling dashboard heading", async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/college scheduling system/i) ||
          screen.getByText(/loading page…/i),
      ).toBeDefined();
    });
  });

  it("shows teacher-specific dashboard content when a teacher role is active", async () => {
    window.localStorage.setItem("userRole", "teacher");
    window.localStorage.setItem("userName", "Ms. Santos");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/welcome, ms\. santos/i)).toBeDefined();
    });
  });
});
