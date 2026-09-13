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
    isCombinedCohort?: boolean
  },
  existingSchedules?: ClassScheduleItem[],
  _existingFacultyList?: any[]
): SlotValidationResult {
  const allSchedules = existingSchedules && existingSchedules.length > 0 ? existingSchedules : storage.getClassSchedules()
  const schedules = allSchedules.filter((s) => String(s.id) !== String(candidate.id))
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Check Faculty Clash
  const facultyClash = schedules.find(
    (s) =>
      s.day.toLowerCase() === candidate.day.toLowerCase() &&
      isTimeOverlapping(s.time, candidate.time) &&
      (s.facultyId === candidate.facultyId || s.faculty.toLowerCase() === candidate.faculty.toLowerCase()) &&
      // If it's a combined cohort sharing the exact same room, it's valid co-instruction
      !(
        (candidate.isCombinedCohort || (s as any).isCombinedCohort) &&
        s.room &&
        candidate.room &&
        s.room.toLowerCase().trim() === candidate.room.toLowerCase().trim()
      )
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
        s.room.toLowerCase().trim() === candidate.room.toLowerCase().trim() &&
        // Allow combined cohort classes with the same instructor
        !(
          (candidate.isCombinedCohort || (s as any).isCombinedCohort) &&
          (s.facultyId === candidate.facultyId || s.faculty.toLowerCase() === candidate.faculty.toLowerCase())
        )
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

  // 4. Faculty Availability restrictions removed per requirements (instructors can be scheduled flexibly at any slot)

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
  Monday: 'Thursday',
  Tuesday: 'Friday',
  Wednesday: 'Saturday',
  Thursday: 'Monday',
  Friday: 'Tuesday',
  Saturday: 'Wednesday',
}

export function getPairedDay(day: string): string | null {
  if (!day) return null
  return DAY_PAIRS[day] || null
}

export function getDayPairLabel(day: string): string {
  const paired = getPairedDay(day)
  if (!paired) return day
  if (day === 'Monday') return 'Monday & Thursday (M-Th)'
  if (day === 'Tuesday') return 'Tuesday & Friday (T-F)'
  if (day === 'Wednesday') return 'Wednesday & Saturday (W-Sa)'
  if (day === 'Thursday') return 'Thursday & Monday (Th-M)'
  if (day === 'Friday') return 'Friday & Tuesday (F-T)'
  if (day === 'Saturday') return 'Saturday & Wednesday (Sa-W)'
  return `${day} & ${paired}`
}

export function isGeneralSubject(sub: any): boolean {
  if (!sub) return false
  if (typeof sub === 'string') {
    const code = sub.toUpperCase().trim()
    if (/^GE[\s-]*\d+/i.test(code) || /^GE\b/i.test(code) || code.startsWith('RS') || code.startsWith('NSTP') || code.startsWith('PE') || code.startsWith('PATHFIT') || code.startsWith('THEOLOGY')) return true
    return false
  }
  if (sub.isMajor === false) return true
  const prog = String(sub.program || '').toUpperCase().trim()
  if (prog === 'ALL' || prog === 'UNIVERSAL' || prog === 'GEN ED' || prog === 'GENERAL EDUCATION') return true
  const dept = String(sub.department || '').toUpperCase().trim()
  if (dept.includes('GENERAL EDUCATION') || dept === 'GEN ED') return true
  const classification = String(sub.classification || '').toUpperCase().trim()
  if (classification.includes('GENERAL EDUCATION')) return true
  const code = String(sub.subjectCode || sub.code || '').toUpperCase().trim()
  if (/^GE[\s-]*\d+/i.test(code) || /^GE\b/i.test(code) || code.startsWith('RS') || code.startsWith('NSTP') || code.startsWith('PE') || code.startsWith('PATHFIT') || code.startsWith('THEOLOGY')) return true
  const name = String(sub.subject || sub.name || '').toUpperCase().trim()
  if (name.includes('GENERAL EDUCATION')) return true
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

/**
 * Returns the expected duration in minutes for a schedule session:
 * - Minor / General Education subjects: 90 minutes (1 hour 30 mins)
 * - Major subjects - Lecture: 120 minutes (2 hours)
 * - Major subjects - Laboratory: 180 minutes (3 hours)
 */
export function getExpectedSubjectDuration(sub: any, classMode: 'Lecture' | 'Laboratory' | string = 'Lecture'): number {
  if (!sub || isGeneralSubject(sub) || sub.isMajor === false) {
    return 90 // 1 hour 30 mins
  }
  const modeClean = String(classMode || '').toLowerCase().trim()
  if (modeClean === 'laboratory' || modeClean === 'lab') {
    return 180 // 3 hours
  }
  return 120 // 2 hours for lecture
}

/**
 * Converts minutes from midnight into standard 12-hour timetable string ("HH:MM AM/PM")
 */
export function minutesToTimeString(totalMinutes: number): string {
  const boundedMin = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1))
  const h24 = Math.floor(boundedMin / 60)
  const m = boundedMin % 60
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  const mPad = m < 10 ? `0${m}` : `${m}`
  const hPad = h12 < 10 ? `0${h12}` : `${h12}`
  return `${hPad}:${mPad} ${ampm}`
}

/**
 * Calculates matching end time given a start time and duration in minutes
 */
export function calculateEndTimeFromStart(startTime: string, durationMinutes: number): string {
  if (!startTime) return '08:30 AM'
  const startMin = parseTimeToMinutes(startTime)
  const endMin = Math.min(startMin + durationMinutes, 21 * 60) // cap at 09:00 PM
  return minutesToTimeString(endMin)
}

/**
 * SRCB Official Standard Time Slots & Period Presets (SY 2026-2027)
 */
export interface SrcbTimeSlotPreset {
  id: string
  label: string
  startTime: string
  endTime: string
  durationMinutes: number
  category: 'm-th-tf' | 'wednesday' | 'saturday' | 'laboratory'
  description?: string
}

export const SRCB_STANDARD_TIME_SLOTS: SrcbTimeSlotPreset[] = [
  // M-Th and T-F Standard 1.5-Hour Lecture Blocks
  { id: 'srcb-p1', label: '07:30 AM - 09:00 AM', startTime: '07:30 AM', endTime: '09:00 AM', durationMinutes: 90, category: 'm-th-tf', description: 'Period 1 (Morning)' },
  { id: 'srcb-p2', label: '09:00 AM - 10:30 AM', startTime: '09:00 AM', endTime: '10:30 AM', durationMinutes: 90, category: 'm-th-tf', description: 'Period 2 (Morning)' },
  { id: 'srcb-p3', label: '10:30 AM - 12:00 PM', startTime: '10:30 AM', endTime: '12:00 PM', durationMinutes: 90, category: 'm-th-tf', description: 'Period 3 (Late Morning)' },
  { id: 'srcb-p4', label: '01:00 PM - 02:30 PM', startTime: '01:00 PM', endTime: '02:30 PM', durationMinutes: 90, category: 'm-th-tf', description: 'Period 4 (Early Afternoon)' },
  { id: 'srcb-p5', label: '02:30 PM - 04:00 PM', startTime: '02:30 PM', endTime: '04:00 PM', durationMinutes: 90, category: 'm-th-tf', description: 'Period 5 (Mid Afternoon)' },
  { id: 'srcb-p6', label: '04:00 PM - 05:30 PM', startTime: '04:00 PM', endTime: '05:30 PM', durationMinutes: 90, category: 'm-th-tf', description: 'Period 6 (Late Afternoon)' },
  { id: 'srcb-p7', label: '05:30 PM - 07:00 PM', startTime: '05:30 PM', endTime: '07:00 PM', durationMinutes: 90, category: 'm-th-tf', description: 'Period 7 (Evening)' },

  // Wednesday Single-Day Lecture / Lab Blocks
  { id: 'srcb-wed-1', label: '04:00 PM - 07:00 PM', startTime: '04:00 PM', endTime: '07:00 PM', durationMinutes: 180, category: 'wednesday', description: 'Wednesday 3h Lecture/Lab' },
  { id: 'srcb-wed-2', label: '05:00 PM - 08:00 PM', startTime: '05:00 PM', endTime: '08:00 PM', durationMinutes: 180, category: 'wednesday', description: 'Wednesday Evening 3h Block' },
  { id: 'srcb-wed-3', label: '05:30 PM - 08:00 PM', startTime: '05:30 PM', endTime: '08:00 PM', durationMinutes: 150, category: 'wednesday', description: 'Wednesday 2.5h Lecture' },

  // Saturday Weekend / Practicum Blocks
  { id: 'srcb-sat-1', label: '07:00 AM - 10:00 AM', startTime: '07:00 AM', endTime: '10:00 AM', durationMinutes: 180, category: 'saturday', description: 'Saturday Early Morning 3h' },
  { id: 'srcb-sat-2', label: '08:00 AM - 10:00 AM', startTime: '08:00 AM', endTime: '10:00 AM', durationMinutes: 120, category: 'saturday', description: 'Saturday Morning 2h (PE/PathFit)' },
  { id: 'srcb-sat-3', label: '08:00 AM - 11:00 AM', startTime: '08:00 AM', endTime: '11:00 AM', durationMinutes: 180, category: 'saturday', description: 'Saturday Morning 3h (Field Study/Lab)' },
  { id: 'srcb-sat-4', label: '09:00 AM - 12:00 PM', startTime: '09:00 AM', endTime: '12:00 PM', durationMinutes: 180, category: 'saturday', description: 'Saturday 3h (PE/PathFit)' },
  { id: 'srcb-sat-5', label: '10:00 AM - 01:00 PM', startTime: '10:00 AM', endTime: '01:00 PM', durationMinutes: 180, category: 'saturday', description: 'Saturday Midday 3h' },
  { id: 'srcb-sat-6', label: '01:00 PM - 03:00 PM', startTime: '01:00 PM', endTime: '03:00 PM', durationMinutes: 120, category: 'saturday', description: 'Saturday Afternoon 2h' },
  { id: 'srcb-sat-7', label: '01:00 PM - 04:00 PM', startTime: '01:00 PM', endTime: '04:00 PM', durationMinutes: 180, category: 'saturday', description: 'Saturday Afternoon 3h' },
  { id: 'srcb-sat-8', label: '02:00 PM - 05:00 PM', startTime: '02:00 PM', endTime: '05:00 PM', durationMinutes: 180, category: 'saturday', description: 'Saturday Research 3h' },
  { id: 'srcb-sat-9', label: '03:00 PM - 05:00 PM', startTime: '03:00 PM', endTime: '05:00 PM', durationMinutes: 120, category: 'saturday', description: 'Saturday Swimming/PE' },
  { id: 'srcb-sat-10', label: '05:00 PM - 08:00 PM', startTime: '05:00 PM', endTime: '08:00 PM', durationMinutes: 180, category: 'saturday', description: 'Saturday Evening 3h' },
  { id: 'srcb-sat-11', label: '06:00 PM - 09:00 PM', startTime: '06:00 PM', endTime: '09:00 PM', durationMinutes: 180, category: 'saturday', description: 'Saturday Night 3h' },

  // Long Intensive Laboratory Blocks (Hospitality & Science)
  { id: 'srcb-lab-1', label: '01:00 PM - 07:00 PM', startTime: '01:00 PM', endTime: '07:00 PM', durationMinutes: 360, category: 'laboratory', description: '6h Culinary / Food Service Lab (M-Th)' },
  { id: 'srcb-lab-2', label: '02:30 PM - 07:30 PM', startTime: '02:30 PM', endTime: '07:30 PM', durationMinutes: 300, category: 'laboratory', description: '5h Catering Lab (T-F)' },
]

/**
 * Institutional SRCB Day Pairing Map
 */
export const SRCB_PAIRED_DAYS: Record<string, string> = {
  Monday: 'Thursday',
  Thursday: 'Monday',
  Tuesday: 'Friday',
  Friday: 'Tuesday',
}

export function isSrcbStandaloneDay(day: string): boolean {
  if (!day) return false
  const d = day.trim().toLowerCase()
  return d === 'wednesday' || d === 'saturday'
}

/**
 * Evaluates faculty workload according to SRCB loading policies
 */
export interface FacultyLoadAssessment {
  status: 'optimal' | 'overload' | 'underload'
  units: number
  limit: number
  difference: number
  label: string
}

export function evaluateFacultyLoad(units: number, isFullTime: boolean): FacultyLoadAssessment {
  const limit = isFullTime ? 24 : 12
  const minTarget = isFullTime ? 18 : 3
  if (units > limit) {
    return {
      status: 'overload',
      units,
      limit,
      difference: units - limit,
      label: `Overload (+${units - limit} units)`,
    }
  }
  if (units < minTarget && units > 0) {
    return {
      status: 'underload',
      units,
      limit,
      difference: minTarget - units,
      label: `Underload (${units} of ${minTarget} min)`,
    }
  }
  return {
    status: 'optimal',
    units,
    limit,
    difference: 0,
    label: 'Optimal Teaching Load',
  }
}



