import { describe, it, expect } from "vitest";
import { validateScheduleSlot, findAvailableRoomForSlot } from "../scheduling";
import type { ClassScheduleItem } from "../../types";

describe("Multi-Room Concurrent Scheduling Logic", () => {
  const roomsList = [
    { number: "COL-101", building: "College Building", capacity: 40, status: "Available" },
    { number: "COL-102", building: "College Building", capacity: 40, status: "Available" },
    { number: "COL-103", building: "College Building", capacity: 40, status: "Available" },
    { number: "COL-104", building: "College Building", capacity: 40, status: "Available" },
    { number: "COL-105", building: "College Building", capacity: 40, status: "Available" },
    { number: "COL-106", building: "College Building", capacity: 40, status: "Available" },
  ];

  const slotTime = "08:00 AM - 09:30 AM";
  const slotDay = "Monday";

  // Simulate 4 already existing schedules in the same slot across 4 separate rooms
  const existingSchedules: ClassScheduleItem[] = [
    {
      id: "sched-itp-1",
      day: slotDay,
      time: slotTime,
      subjectCode: "IT101",
      subject: "Introduction to Computing",
      section: "BSIT 1-A",
      faculty: "Prof. Ada Lovelace",
      facultyId: "FAC-001",
      room: "COL-101",
      building: "College Building",
      modality: "Face-to-Face",
      program: "ITP",
      color: "#800000",
    },
    {
      id: "sched-bap-1",
      day: slotDay,
      time: slotTime,
      subjectCode: "BA101",
      subject: "Principles of Management",
      section: "BSBA 1-A",
      faculty: "Prof. Adam Smith",
      facultyId: "FAC-002",
      room: "COL-102",
      building: "College Building",
      modality: "Face-to-Face",
      program: "BAP",
      color: "#d97706",
    },
    {
      id: "sched-cjep-1",
      day: slotDay,
      time: slotTime,
      subjectCode: "CRIM101",
      subject: "Intro to Criminology",
      section: "BSCRIM 1-A",
      faculty: "Capt. John Miller",
      facultyId: "FAC-003",
      room: "COL-103",
      building: "College Building",
      modality: "Face-to-Face",
      program: "CJEP",
      color: "#172554",
    },
    {
      id: "sched-tep-1",
      day: slotDay,
      time: slotTime,
      subjectCode: "EDUC101",
      subject: "Child Development",
      section: "BSED 1-A",
      faculty: "Dr. Maria Montessori",
      facultyId: "FAC-004",
      room: "COL-104",
      building: "College Building",
      modality: "Face-to-Face",
      program: "TEP",
      color: "#2563eb",
    },
  ];

  const facultyList = [
    { id: "FAC-001", name: "Prof. Ada Lovelace", status: "Full-Time" },
    { id: "FAC-002", name: "Prof. Adam Smith", status: "Full-Time" },
    { id: "FAC-003", name: "Capt. John Miller", status: "Full-Time" },
    { id: "FAC-004", name: "Dr. Maria Montessori", status: "Full-Time" },
    { id: "FAC-005", name: "Chef Auguste Escoffier", status: "Full-Time" },
  ];

  it("permits scheduling a 5th class in the same slot if assigned to a distinct room (COL-105)", () => {
    const candidate5th = {
      day: slotDay,
      time: slotTime,
      room: "COL-105",
      building: "College Building",
      faculty: "Chef Auguste Escoffier",
      facultyId: "FAC-005",
      section: "BSHM 1-A",
      modality: "Face-to-Face" as const,
    };

    const validation = validateScheduleSlot(candidate5th, existingSchedules, facultyList);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.concurrentCount).toBe(4);
    expect(validation.occupiedRoomsInSlot).toEqual(["COL-101", "COL-102", "COL-103", "COL-104"]);
  });

  it("detects a Room Collision error if scheduling in a room already in use in that slot", () => {
    const collidingCandidate = {
      day: slotDay,
      time: slotTime,
      room: "COL-101", // already occupied by ITP
      building: "College Building",
      faculty: "Chef Auguste Escoffier",
      facultyId: "FAC-005",
      section: "BSHM 1-A",
      modality: "Face-to-Face" as const,
    };

    const validation = validateScheduleSlot(collidingCandidate, existingSchedules, facultyList);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((err) => err.includes("Room collision"))).toBe(true);
  });

  it("findAvailableRoomForSlot correctly finds the first unbooked room for a multi-schedule slot", () => {
    const nextRoom = findAvailableRoomForSlot(slotDay, slotTime, roomsList, existingSchedules);
    expect(nextRoom).not.toBeNull();
    // COL-101, 102, 103, 104 are taken, so COL-105 must be selected!
    expect(nextRoom?.number).toBe("COL-105");
  });
});
