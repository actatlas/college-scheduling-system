export type UserRole = "admin" | "teacher" | "student";

export interface GeneratedScheduleItem {
  id: string;
  subject: string;
  day: string;
  time: string;
  room: string;
  faculty: string;
  color: string;
  program: string;
  section: string;
  type: string;
}

export interface TeacherAvailabilityEntry {
  day: string;
  slots: string[];
}

export interface AiRecommendation {
  id: string;
  title: string;
  detail: string;
  suggestion: string;
  severity: "High" | "Medium" | "Low";
}

export function parseTeacherAvailability(raw?: string | null): TeacherAvailabilityEntry[] {
  if (!raw) return [];

  return raw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [day, ...slots] = entry.split(":");
      return {
        day: day.trim(),
        slots: slots.join(":").split(",").map((slot) => slot.trim()).filter(Boolean),
      };
    });
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const times = ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "01:00-02:00", "02:00-03:00"];

function pickSlot(usedByTeacher: Map<string, Set<string>>, usedByRoom: Map<string, Set<string>>, usedBySection: Map<string, Set<string>>, teacherAvailability: TeacherAvailabilityEntry[], teacherName: string, roomName: string, sectionName: string) {
  const availabilityMap = new Map(teacherAvailability.map((entry) => [entry.day, entry.slots]));

  for (const day of days) {
    const availableSlots = availabilityMap.get(day) ?? times;
    for (const time of availableSlots) {
      const teacherKey = `${teacherName}:${day}:${time}`;
      const roomKey = `${roomName}:${day}:${time}`;
      const sectionKey = `${sectionName}:${day}:${time}`;
      if (usedByTeacher.get(teacherName)?.has(teacherKey)) continue;
      if (usedByRoom.get(roomName)?.has(roomKey)) continue;
      if (usedBySection.get(sectionName)?.has(sectionKey)) continue;

      return { day, time };
    }
  }

  return null;
}

export function buildAiRecommendations(scheduleItems: GeneratedScheduleItem[]): AiRecommendation[] {
  const byTeacher = new Map<string, number>();
  const byRoom = new Map<string, number>();
  const byTime = new Map<string, number>();

  for (const item of scheduleItems) {
    byTeacher.set(item.faculty, (byTeacher.get(item.faculty) ?? 0) + 1);
    byRoom.set(item.room, (byRoom.get(item.room) ?? 0) + 1);
    byTime.set(`${item.day}:${item.time}`, (byTime.get(`${item.day}:${item.time}`) ?? 0) + 1);
  }

  const recommendations: AiRecommendation[] = [];

  for (const [teacher, count] of byTeacher.entries()) {
    if (count >= 2) {
      recommendations.push({
        id: `teacher-${teacher}`,
        title: `Reassign ${teacher}'s overload`,
        detail: `${teacher} is assigned to ${count} classes in the same window.`,
        suggestion: "Shift one class to a different instructor or lower-priority slot.",
        severity: "High",
      });
    }
  }

  for (const [room, count] of byRoom.entries()) {
    if (count >= 2) {
      recommendations.push({
        id: `room-${room}`,
        title: `Room conflict for ${room}`,
        detail: `${room} is being used ${count} times at the same period.`,
        suggestion: "Move one class to an alternate room or stagger the lesson block.",
        severity: "High",
      });
    }
  }

  for (const [slot, count] of byTime.entries()) {
    if (count >= 2) {
      recommendations.push({
        id: `slot-${slot}`,
        title: `Shift a class from ${slot}`,
        detail: `${count} lessons overlap in ${slot}.`,
        suggestion: "Spread the timetable by moving one lesson to a nearby slot.",
        severity: "Medium",
      });
    }
  }

  return recommendations.slice(0, 4);
}

export function generateScheduleSeed(option?: { role?: UserRole; programKey?: string; section?: string; teacherName?: string; availability?: TeacherAvailabilityEntry[] }) {
  const role = option?.role ?? "admin";
  const programKey = option?.programKey ?? "ITP";
  const section = option?.section ?? "A";
  const teacherName = option?.teacherName ?? "Mr. Reyes";
  const availability = option?.availability ?? [
    { day: "Monday", slots: ["08:00-09:00", "09:00-10:00"] },
    { day: "Tuesday", slots: ["10:00-11:00", "11:00-12:00"] },
    { day: "Wednesday", slots: ["01:00-02:00", "02:00-03:00"] },
    { day: "Thursday", slots: ["08:00-09:00", "09:00-10:00"] },
    { day: "Friday", slots: ["10:00-11:00", "02:00-03:00"] },
  ];

  const lessons = [
    { subject: "Programming 1", faculty: teacherName, room: "R-101", color: "#2563eb", type: "Lecture" },
    { subject: "Discrete Math", faculty: "Ms. Santos", room: "SCI-05", color: "#0f766e", type: "Lab" },
    { subject: "English Communication", faculty: "Mrs. Cruz", room: "R-202", color: "#d97706", type: "Lecture" },
    { subject: "Database Systems", faculty: "Mr. Dela Cruz", room: "LAB-02", color: "#7c3aed", type: "Lab" },
  ];

  const usedByTeacher = new Map<string, Set<string>>();
  const usedByRoom = new Map<string, Set<string>>();
  const usedBySection = new Map<string, Set<string>>();

  const generated: GeneratedScheduleItem[] = [];

  for (const lesson of lessons) {
    const slot = pickSlot(usedByTeacher, usedByRoom, usedBySection, availability, lesson.faculty, lesson.room, section);
    if (!slot) continue;

    const teacherSet = usedByTeacher.get(lesson.faculty) ?? new Set<string>();
    teacherSet.add(`${lesson.faculty}:${slot.day}:${slot.time}`);
    usedByTeacher.set(lesson.faculty, teacherSet);

    const roomSet = usedByRoom.get(lesson.room) ?? new Set<string>();
    roomSet.add(`${lesson.room}:${slot.day}:${slot.time}`);
    usedByRoom.set(lesson.room, roomSet);

    const sectionSet = usedBySection.get(section) ?? new Set<string>();
    sectionSet.add(`${section}:${slot.day}:${slot.time}`);
    usedBySection.set(section, sectionSet);

    generated.push({
      id: `${lesson.subject}-${slot.day}-${slot.time}`,
      subject: lesson.subject,
      day: slot.day,
      time: slot.time,
      room: lesson.room,
      faculty: lesson.faculty,
      color: lesson.color,
      program: programKey,
      section,
      type: lesson.type,
    });
  }

  if (role === "teacher") {
    return generated.filter((entry) => entry.faculty === teacherName);
  }

  if (role === "student") {
    return generated.filter((entry) => entry.section === section && entry.program === programKey);
  }

  return generated;
}
