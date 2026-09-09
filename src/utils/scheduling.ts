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

function to12Hour(t: string, defaultPM = false): string {
  if (!t) return ''
  const clean = t.trim()
  const isPM = /pm/i.test(clean)
  const isAM = /am/i.test(clean)
  const raw = clean.replace(/am|pm/i, '').trim()
  const [hStr, mStr = '00'] = raw.split(':')
  let h = Number(hStr) || 0
  const m = mStr.slice(0, 2)
  if (isPM && h < 12) h += 12
  if (isAM && h === 12) h = 0
  if (!isPM && !isAM) {
    if (defaultPM && h <= 11) {
      h += 12
    } else if (h >= 1 && h <= 6) {
      h += 12
    }
  }
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

export function formatAvailabilitySlotRange(slot: string): string {
  if (!slot) return ''
  if (slot.includes('-')) {
    const [start, end] = slot.split('-').map((s) => s.trim())
    const formattedStart = to12Hour(start)
    const isStartPM = formattedStart.includes('PM')
    const formattedEnd = to12Hour(end, isStartPM)
    return `${formattedStart} - ${formattedEnd}`
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
  if (!isPM && !isAM && h >= 1 && h <= 6) h += 12
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
  concurrentCount?: number
  occupiedRoomsInSlot?: string[]
}

/**
 * Finds the first available physical room that is not occupied during the requested day and time slot.
 */
export function findAvailableRoomForSlot(
  day: string,
  time: string,
  roomsList: Array<{ number: string; building?: string; type?: string; status?: string; capacity?: number }>,
  existingSchedules: ClassScheduleItem[] = [],
  excludeId?: string
): { number: string; building?: string; type?: string; capacity?: number } | null {
  if (!day || !time || !roomsList || roomsList.length === 0) return null;

  const occupiedRoomNumbers = new Set(
    existingSchedules
      .filter((s) => {
        if (excludeId && String(s.id) === String(excludeId)) return false;
        if (s.modality === 'Online') return false;
        if (s.day.toLowerCase() !== day.toLowerCase()) return false;
        return isTimeOverlapping(s.time, time);
      })
      .map((s) => String(s.room || '').toLowerCase().trim())
      .filter(Boolean)
  );

  const available = roomsList.find((r) => {
    const status = String(r.status || '').toLowerCase();
    if (status === 'maintenance' || status === 'closed' || status === 'inactive') return false;
    const num = String(r.number).toLowerCase().trim();
    return !occupiedRoomNumbers.has(num);
  });

  return available || null;
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
    (f) =>
      (candidate.facultyId && String(f.id) === String(candidate.facultyId)) ||
      (f.name && candidate.faculty && f.name.toLowerCase().trim() === candidate.faculty.toLowerCase().trim())
  )
  if (teacher && teacher.status === 'Part-Time') {
    if (!teacher.availability || !teacher.availability.trim()) {
      errors.push(
        `Instructor unavailable: ${teacher.name} has not registered availability for ${candidate.day}.`
      )
    } else {
      const parsedAvail = parseTeacherAvailability(teacher.availability)
      const dayEntry = parsedAvail.find((d) => d.day.toLowerCase() === candidate.day.toLowerCase())
      if (!dayEntry || dayEntry.slots.length === 0) {
        errors.push(
          `Instructor unavailable: ${teacher.name} has not registered availability for ${candidate.day}.`
        )
      } else {
        const [candStartStr, candEndStr] = candidate.time.split('-').map((t) => t.trim())
        const candStartMin = parseTimeToMinutes(candStartStr)
        const candEndMin = parseTimeToMinutes(candEndStr)

        const isSlotValid = dayEntry.slots.some((slot) => {
          const [slotStartStr, slotEndStr] = slot.split('-').map((t) => t.trim())
          const slotStartMin = parseTimeToMinutes(slotStartStr)
          const slotEndMin = parseTimeToMinutes(slotEndStr)
          if (slotStartMin !== undefined && slotEndMin !== undefined && candStartMin !== undefined && candEndMin !== undefined) {
            if (candStartMin >= slotStartMin && candEndMin <= slotEndMin) return true
          }
          return slot.includes(candidate.time) || candidate.time.includes(slot)
        })

        if (!isSlotValid) {
          errors.push(
            `Instructor availability mismatch: ${teacher.name} is available on ${candidate.day} at [${dayEntry.slots.map(formatAvailabilitySlotRange).join(', ')}], but this slot is ${candidate.time}.`
          )
        }
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

  // 6. Concurrent Multi-Room Slot Information
  const concurrentSchedules = schedules.filter(
    (s) =>
      s.day.toLowerCase() === candidate.day.toLowerCase() &&
      isTimeOverlapping(s.time, candidate.time)
  )
  const occupiedRooms = Array.from(
    new Set(
      concurrentSchedules
        .filter((s) => s.modality !== 'Online' && s.room)
        .map((s) => String(s.room).trim())
    )
  )

  if (candidate.modality === 'Face-to-Face' && concurrentSchedules.length > 0 && errors.length === 0) {
    warnings.push(
      `Concurrent slot: ${concurrentSchedules.length} class${concurrentSchedules.length > 1 ? 'es' : ''} running at this time across distinct room${occupiedRooms.length > 1 ? 's' : ''} (${occupiedRooms.join(', ')}). Room ${candidate.room} is clear.`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    concurrentCount: concurrentSchedules.length,
    occupiedRoomsInSlot: occupiedRooms,
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

export const DAY_PAIRS: Record<string, string> = {
  Monday: 'Friday',
  Tuesday: 'Friday',
  Wednesday: 'Saturday',
  Thursday: 'Friday',
  Friday: 'Monday',
  Saturday: 'Wednesday',
}

export function getPairedDay(day: string): string | null {
  if (!day) return null
  return DAY_PAIRS[day] || 'Friday'
}

export function getDayPairLabel(day: string): string {
  const paired = getPairedDay(day)
  if (!paired) return day
  if (day === 'Monday') return 'Monday & Friday (M-F)'
  if (day === 'Tuesday') return 'Tuesday & Friday (T-F)'
  if (day === 'Wednesday') return 'Wednesday & Saturday (W-Sa)'
  if (day === 'Thursday') return 'Thursday & Friday (Th-F)'
  if (day === 'Friday') return 'Friday & Monday (F-M)'
  if (day === 'Saturday') return 'Saturday & Wednesday (Sa-W)'
  return `${day} & ${paired}`
}

export function isGeneralSubject(sub: any): boolean {
  if (!sub) return false
  if (sub.isMajor === false) return true
  const prog = String(sub.program || '').toUpperCase().trim()
  if (prog === 'ALL' || prog === 'UNIVERSAL' || prog === 'GEN ED' || prog === 'GENERAL EDUCATION') return true
  const dept = String(sub.department || '').toUpperCase().trim()
  if (dept.includes('GENERAL EDUCATION') || dept === 'GEN ED') return true
  const classification = String(sub.classification || '').toUpperCase().trim()
  if (classification.includes('GENERAL EDUCATION')) return true
  const code = String(sub.code || '').toUpperCase().trim()
  if (/^GE\d+/i.test(code) || code.startsWith('RS') || code.startsWith('NSTP') || code.startsWith('PE') || code.startsWith('PATHFIT')) return true
  return false
}

export function canProgramTakeSubject(sub: any, programCode?: string): boolean {
  if (!sub) return false
  if (isGeneralSubject(sub)) return true
  if (!programCode || programCode === 'ALL') return true
  const subProg = String(sub.program || '').toUpperCase().trim()
  const targetProg = String(programCode).toUpperCase().trim()
  return subProg === targetProg || subProg === 'ALL' || subProg === 'UNIVERSAL'
}

