import { describe, expect, it } from "vitest";
import { buildAiRecommendations } from "./scheduling";
import type { ClassScheduleItem } from "../types";

describe("buildAiRecommendations", () => {
  it("returns actionable recommendations for overloaded schedules", () => {
    const scheduleItems: ClassScheduleItem[] = [
      {
        id: "class-1",
        subjectCode: "IT101",
        subject: "Programming 1",
        day: "Monday",
        time: "08:00-09:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#2563eb",
        program: "ITP",
        section: "A",
        modality: "Face-to-Face",
      },
      {
        id: "class-2",
        subjectCode: "IT102",
        subject: "Discrete Math",
        day: "Monday",
        time: "08:00-09:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#0f766e",
        program: "ITP",
        section: "B",
        modality: "Face-to-Face",
      },
      {
        id: "class-3",
        subjectCode: "IT201",
        subject: "Database Systems",
        day: "Tuesday",
        time: "09:00-10:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#7c3aed",
        program: "ITP",
        section: "A",
        modality: "Face-to-Face",
      },
      {
        id: "class-4",
        subjectCode: "IT202",
        subject: "Web Dev",
        day: "Wednesday",
        time: "09:00-10:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#7c3aed",
        program: "ITP",
        section: "A",
        modality: "Face-to-Face",
      },
      {
        id: "class-5",
        subjectCode: "IT301",
        subject: "Software Eng",
        day: "Thursday",
        time: "09:00-10:00",
        room: "R-101",
        building: "College Building",
        faculty: "Ms. Santos",
        color: "#7c3aed",
        program: "ITP",
        section: "A",
        modality: "Face-to-Face",
      },
    ];

    const recommendations = buildAiRecommendations(scheduleItems);

    expect(recommendations.length).toBeGreaterThan(0);
  });
});
