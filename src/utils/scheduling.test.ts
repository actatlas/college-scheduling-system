import { describe, expect, it } from "vitest";
import { buildAiRecommendations } from "./scheduling";

describe("buildAiRecommendations", () => {
  it("returns actionable recommendations for overloaded schedules", () => {
    const scheduleItems = [
      {
        id: "class-1",
        subject: "Programming 1",
        day: "Monday",
        time: "08:00-09:00",
        room: "R-101",
        faculty: "Ms. Santos",
        color: "#2563eb",
        program: "ITP",
        section: "A",
        type: "Lecture",
      },
      {
        id: "class-2",
        subject: "Discrete Math",
        day: "Monday",
        time: "08:00-09:00",
        room: "R-101",
        faculty: "Mr. Reyes",
        color: "#0f766e",
        program: "ITP",
        section: "B",
        type: "Lab",
      },
      {
        id: "class-3",
        subject: "Database Systems",
        day: "Tuesday",
        time: "09:00-10:00",
        room: "LAB-02",
        faculty: "Ms. Santos",
        color: "#7c3aed",
        program: "ITP",
        section: "A",
        type: "Lab",
      },
    ];

    const recommendations = buildAiRecommendations(scheduleItems);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].title).toMatch(/recommend|reassign|shift/i);
  });
});
