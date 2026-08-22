import type { UserRole, ClassScheduleItem } from '../types'
import { storage } from '../data/storage'

export type { UserRole }

export interface TeacherAvailabilityEntry {
  day: string
  slots: string[]
}

export interface AiRecommendation {
  id: string
  title: string
  detail: string
  suggestion: string
  severity: 'High' | 'Medium' | 'Low'
}

export function parseTeacherAvailability(raw?: string | null): TeacherAvailabilityEntry[] {
  if (!raw) return []

  return raw
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [day, ...slots] = entry.split(':')
      return {
        day: day.trim(),
        slots: slots
          .join(':')
          .split(',')
          .map((slot) => slot.trim())
          .filter(Boolean),
      }
    })
}

export interface SlotValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateScheduleSlot(
  candidate: {
    id?: string
    day: string
    time: string
    room: string
    building: string
    faculty: string
    facultyId?: string
    section: string
    modality: 'Face-to-Face' | 'Online'
  },
  existingSchedules?: ClassScheduleItem[],
  existingFacultyList?: any[]
): SlotValidationResult {
  const allSchedules = existingSchedules && existingSchedules.length > 0 ? existingSchedules : storage.getClassSchedules()
  const schedules = allSchedules.filter((s) => String(s.id) !== String(candidate.id))
  const facultyList = existingFacultyList && existingFacultyList.length > 0 ? existingFacultyList : storage.getFaculty()
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Check Faculty Clash
  const facultyClash = schedules.find(
    (s) =>
      s.day.toLowerCase() === candidate.day.toLowerCase() &&
      s.time === candidate.time &&
      (s.facultyId === candidate.facultyId || s.faculty.toLowerCase() === candidate.faculty.toLowerCase())
  )
  if (facultyClash) {
    errors.push(
      `Faculty double-booking: ${candidate.faculty} is already scheduled for ${facultyClash.subject} (${facultyClash.section}) at this day and time.`
    )
  }

  // 2. Check Room Collision (if Face-to-Face)
  if (candidate.modality === 'Face-to-Face') {
    const roomClash = schedules.find(
      (s) =>
        s.modality === 'Face-to-Face' &&
        s.day.toLowerCase() === candidate.day.toLowerCase() &&
        s.time === candidate.time &&
        s.room.toLowerCase() === candidate.room.toLowerCase() &&
        s.building.toLowerCase() === candidate.building.toLowerCase()
    )
    if (roomClash) {
      errors.push(
        `Room collision: Room ${candidate.room} (${candidate.building}) is already occupied by ${roomClash.subject} (${roomClash.section}).`
      )
    }
  }

  // 3. Check Section Overlap
  const sectionClash = schedules.find(
    (s) =>
      s.day.toLowerCase() === candidate.day.toLowerCase() &&
      s.time === candidate.time &&
      s.section.toLowerCase() === candidate.section.toLowerCase()
  )
  if (sectionClash) {
    errors.push(
      `Section overlap: Section ${candidate.section} already has a class scheduled (${sectionClash.subject}) at this day and time.`
    )
  }

  // 4. Check Part-Time Faculty Availability
  const teacher = facultyList.find(
    (f) => f.id === candidate.facultyId || f.name.toLowerCase() === candidate.faculty.toLowerCase()
  )
  if (teacher && teacher.status === 'Part-Time' && teacher.availability) {
    const parsedAvail = parseTeacherAvailability(teacher.availability)
    const dayEntry = parsedAvail.find((d) => d.day.toLowerCase() === candidate.day.toLowerCase())
    if (!dayEntry) {
      warnings.push(
        `Part-time availability warning: ${teacher.name} is not marked as available on ${candidate.day}. (Availability: ${teacher.availability})`
      )
    } else if (dayEntry.slots.length > 0) {
      const isSlotListed = dayEntry.slots.some((slot) => candidate.time.includes(slot) || slot.includes(candidate.time.split('-')[0]))
      if (!isSlotListed) {
        warnings.push(
          `Part-time time slot advisory: ${teacher.name} preferred times on ${candidate.day} are [${dayEntry.slots.join(', ')}].`
        )
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function buildAiRecommendations(scheduleItems: ClassScheduleItem[]): AiRecommendation[] {
  const byTeacher = new Map<string, number>()
  const byRoom = new Map<string, number>()
  const byTime = new Map<string, number>()

  for (const item of scheduleItems) {
    byTeacher.set(item.faculty, (byTeacher.get(item.faculty) ?? 0) + 1)
    if (item.modality === 'Face-to-Face') {
      byRoom.set(`${item.room} (${item.building})`, (byRoom.get(`${item.room} (${item.building})`) ?? 0) + 1)
    }
    byTime.set(`${item.day}:${item.time}`, (byTime.get(`${item.day}:${item.time}`) ?? 0) + 1)
  }

  const recommendations: AiRecommendation[] = []

  for (const [teacher, count] of byTeacher.entries()) {
    if (count >= 5) {
      recommendations.push({
        id: `teacher-${teacher}`,
        title: `Workload Alert for ${teacher}`,
        detail: `${teacher} has ${count} scheduled blocks this week.`,
        suggestion: 'Review teaching load to prevent instructor fatigue.',
        severity: 'Medium',
      })
    }
  }

  for (const [room, count] of byRoom.entries()) {
    if (count >= 4) {
      recommendations.push({
        id: `room-${room}`,
        title: `High Facility Utilization: ${room}`,
        detail: `${room} is scheduled for ${count} class sessions.`,
        suggestion: 'Consider utilizing alternative rooms in SHS or JHS buildings.',
        severity: 'Low',
      })
    }
  }

  return recommendations.slice(0, 4)
}
