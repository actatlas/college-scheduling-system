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

function to12Hour(t: string): string {
  if (!t) return ''
  const [hStr, mStr = '00'] = t.split(':')
  let h = Number(hStr) || 0
  const m = mStr.slice(0, 2)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

export function formatAvailabilitySlotRange(slot: string): string {
  if (!slot) return ''
  if (slot.includes('-')) {
    const [start, end] = slot.split('-').map((s) => s.trim())
    return `${to12Hour(start)} - ${to12Hour(end)}`
  }
  return to12Hour(slot)
}

export function parseTeacherAvailability(raw?: string | null): TeacherAvailabilityEntry[] {
  if (!raw) return []

  const map = new Map<string, string[]>()
  const entries = raw.split('|').map((entry) => entry.trim()).filter(Boolean)

  for (const entry of entries) {
    const [day, ...slots] = entry.split(':')
    const d = day.trim()
    const sList = slots.join(':').split(',').map((s) => s.trim()).filter(Boolean)
    const existing = map.get(d) || []
    map.set(d, [...existing, ...sList])
  }

  return Array.from(map.entries()).map(([day, slots]) => ({
    day,
    slots: Array.from(new Set(slots)),
  }))
}

export function formatGroupedAvailability(raw?: string | null): Array<{ day: string; formattedRange: string }> {
  const parsed = parseTeacherAvailability(raw)
  return parsed.map(({ day, slots }) => ({
    day,
    formattedRange: slots.map(formatAvailabilitySlotRange).join(', ') || 'All Day',
  }))
}

export function parseTimeToMinutes(tStr: string): number {
  if (!tStr) return 0
  const clean = tStr.trim()
  const isPM = /pm/i.test(clean)
  const isAM = /am/i.test(clean)
  const raw = clean.replace(/am|pm/i, '').trim()
  const parts = raw.split(':')
  let h = Number(parts[0]) || 0
  const m = Number(parts[1]) || 0
  if (isPM && h < 12) h += 12
  if (isAM && h === 12) h = 0
  if (!isPM && !isAM && h >= 1 && h <= 7) h += 12
  return h * 60 + m
}

export function isTimeOverlapping(rangeA: string, rangeB: string): boolean {
  if (!rangeA || !rangeB) return false
  if (rangeA.trim().toLowerCase() === rangeB.trim().toLowerCase()) return true

  const partsA = rangeA.split('-').map((s) => s.trim())
  const partsB = rangeB.split('-').map((s) => s.trim())
  if (partsA.length < 2 || partsB.length < 2) {
    return rangeA.trim() === rangeB.trim()
  }

  const startA = parseTimeToMinutes(partsA[0])
  const endA = parseTimeToMinutes(partsA[1])
  const startB = parseTimeToMinutes(partsB[0])
  const endB = parseTimeToMinutes(partsB[1])

  return startA < endB && startB < endA
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
      isTimeOverlapping(s.time, candidate.time) &&
      (s.facultyId === candidate.facultyId || s.faculty.toLowerCase() === candidate.faculty.toLowerCase())
  )
  if (facultyClash) {
    errors.push(
      `Faculty double-booking: ${candidate.faculty} is already scheduled for ${facultyClash.subject} (${facultyClash.section}) at this day and time.`
    )
  }

  // 2. Check Room Collision (if Face-to-Face)
  if (candidate.modality === 'Face-to-Face' && candidate.room) {
    const roomClash = schedules.find(
      (s) =>
        s.modality === 'Face-to-Face' &&
        s.day.toLowerCase() === candidate.day.toLowerCase() &&
        isTimeOverlapping(s.time, candidate.time) &&
        s.room &&
        candidate.room &&
        s.room.toLowerCase().trim() === candidate.room.toLowerCase().trim()
    )
    if (roomClash) {
      errors.push(
        `Room collision: Room ${candidate.room} is already occupied by ${roomClash.subject} (${roomClash.section}) on ${candidate.day} at ${candidate.time}.`
      )
    }
  }

  // 3. Check Section Overlap
  const sectionClash = schedules.find(
    (s) =>
      s.day.toLowerCase() === candidate.day.toLowerCase() &&
      isTimeOverlapping(s.time, candidate.time) &&
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
      errors.push(
        `Instructor unavailable: ${teacher.name} has not registered availability for ${candidate.day}.`
      )
    } else if (dayEntry.slots.length > 0) {
      const [candStart] = candidate.time.split('-').map((t) => t.trim())
      const isSlotListed = dayEntry.slots.some((slot) => {
        const [sStart] = slot.split('-').map((t) => t.trim())
        return (
          slot.includes(candidate.time) ||
          candidate.time.includes(slot) ||
          (sStart && candStart && sStart.slice(0, 2) === candStart.slice(0, 2))
        )
      })
      if (!isSlotListed) {
        errors.push(
          `Instructor availability mismatch: ${teacher.name} is available on ${candidate.day} at [${dayEntry.slots.map(formatAvailabilitySlotRange).join(', ')}], but this slot is ${candidate.time}.`
        )
      }
    }
  }

  // 5. Check Room Capacity vs Section Headcount
  if (candidate.modality === 'Face-to-Face' && candidate.room && candidate.section) {
    const allRooms = storage.getRooms()
    const roomObj = allRooms.find((r: any) => String(r.number).toLowerCase().trim() === String(candidate.room).toLowerCase().trim())
    const allSections = storage.getSections()
    const secObj = allSections.find((s: any) => {
      const sName = String(s.section || '').toLowerCase().trim()
      const sFull = s.course ? `${s.course} ${s.yearLevel || ''}-${s.section}`.toLowerCase().trim() : ''
      const candSec = candidate.section.toLowerCase().trim()
      return sName === candSec || sFull === candSec || candSec.includes(sName)
    })

    if (roomObj && secObj && secObj.students && Number(roomObj.capacity) < Number(secObj.students)) {
      errors.push(
        `Room capacity exceeded: Room ${candidate.room} capacity (${roomObj.capacity}) is smaller than the section student headcount (${secObj.students}).`
      )
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
