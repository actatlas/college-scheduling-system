import type {
  UserAccount,
  FacultyMember,
  SubjectItem,
  RoomItem,
  SectionItem,
  ClassScheduleItem,
  ExamScheduleItem,
  ConflictItem,
} from '../types'

const STORAGE_KEYS = {
  USERS: 'srcb_users',
  FACULTY: 'srcb_faculty',
  ROOMS: 'srcb_rooms',
  SUBJECTS: 'srcb_subjects',
  SECTIONS: 'srcb_sections',
  PROGRAMS: 'srcb_programs',
  CLASS_SCHEDULES: 'srcb_class_schedules',
  EXAM_SCHEDULES: 'srcb_exam_schedules',
  SETTINGS: 'srcb_settings',
  NOTIFICATIONS: 'srcb_notifications',
}

// Initial Seed Data
const defaultUsers: UserAccount[] = [
  {
    id: 'USR-001',
    name: 'Engr. Super Admin (ICT)',
    email: 'superadmin@srcb.edu.ph',
    role: 'super_admin',
    status: 'Active',
    createdAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'USR-002',
    name: 'Registrar Admin',
    email: 'admin@srcb.edu.ph',
    role: 'admin',
    status: 'Active',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'USR-003',
    name: 'Dr. Alan Turing (IT Head)',
    email: 'head.it@srcb.edu.ph',
    role: 'program_head',
    program: 'BSIT',
    status: 'Active',
    createdAt: '2026-01-20T08:00:00.000Z',
  },
  {
    id: 'USR-004',
    name: 'Prof. Mary Cruz (BSBA Head)',
    email: 'head.ba@srcb.edu.ph',
    role: 'program_head',
    program: 'BSBA',
    status: 'Active',
    createdAt: '2026-01-20T08:00:00.000Z',
  },
  {
    id: 'USR-005',
    name: 'Prof. John Doe (TEP Head)',
    email: 'head.tep@srcb.edu.ph',
    role: 'program_head',
    program: 'TEP',
    status: 'Active',
    createdAt: '2026-02-01T08:00:00.000Z',
  },
]

const defaultPrograms = [
  { code: 'BAP', name: 'Business Administration Program', focus: 'Business Administration & Management' },
  { code: 'ITP', name: 'Information Technology Program', focus: 'Information Technology & Software Development' },
  { code: 'CJEP', name: 'Criminal Justice Education Program', focus: 'Criminal Justice & Law Enforcement' },
  { code: 'TEP', name: 'Teacher Education Program', focus: 'Teacher & Secondary Education' },
  { code: 'HMP', name: 'Hospitality Management Program', focus: 'Hospitality & Culinary Management' },
]

const defaultFaculty: FacultyMember[] = []
const defaultRooms: RoomItem[] = []
const defaultSubjects: SubjectItem[] = []
const defaultSections: SectionItem[] = []
const defaultClassSchedules: ClassScheduleItem[] = []
const defaultExamSchedules: ExamScheduleItem[] = []

class LocalStorageService {
  private notifyListeners() {
    window.dispatchEvent(new Event('scheduling_storage_update'))
  }

  private getItem<T>(key: string, defaultVal: T): T {
    try {
      const item = localStorage.getItem(key)
      if (!item) {
        localStorage.setItem(key, JSON.stringify(defaultVal))
        return defaultVal
      }
      return JSON.parse(item) as T
    } catch {
      return defaultVal
    }
  }

  private setItem<T>(key: string, val: T): void {
    try {
      const next = JSON.stringify(val)
      const prev = localStorage.getItem(key)
      if (prev === next) {
        return
      }
      localStorage.setItem(key, next)
      this.notifyListeners()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Storage write error', e)
    }
  }

  initSeedData(forceReset = false) {
    const CLEAN_SLATE_KEY = 'srcb_clean_slate_2026_purge'
    if (forceReset || !localStorage.getItem(CLEAN_SLATE_KEY)) {
      localStorage.removeItem(STORAGE_KEYS.FACULTY)
      localStorage.removeItem(STORAGE_KEYS.ROOMS)
      localStorage.removeItem(STORAGE_KEYS.SUBJECTS)
      localStorage.removeItem(STORAGE_KEYS.SECTIONS)
      localStorage.removeItem(STORAGE_KEYS.CLASS_SCHEDULES)
      localStorage.removeItem(STORAGE_KEYS.EXAM_SCHEDULES)
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS)
      localStorage.setItem(CLEAN_SLATE_KEY, 'true')
    }

    if (forceReset || !localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.setItem(STORAGE_KEYS.USERS, defaultUsers)
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.PROGRAMS)) {
      this.setItem(STORAGE_KEYS.PROGRAMS, defaultPrograms)
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.FACULTY)) {
      this.setItem(STORAGE_KEYS.FACULTY, defaultFaculty)
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.ROOMS)) {
      this.setItem(STORAGE_KEYS.ROOMS, defaultRooms)
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
      this.setItem(STORAGE_KEYS.SUBJECTS, defaultSubjects)
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.SECTIONS)) {
      this.setItem(STORAGE_KEYS.SECTIONS, defaultSections)
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.CLASS_SCHEDULES)) {
      this.setItem(STORAGE_KEYS.CLASS_SCHEDULES, defaultClassSchedules)
    }
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.EXAM_SCHEDULES)) {
      this.setItem(STORAGE_KEYS.EXAM_SCHEDULES, defaultExamSchedules)
    }
  }

  // --- Users ---
  getUsers(): UserAccount[] {
    return this.getItem<UserAccount[]>(STORAGE_KEYS.USERS, defaultUsers)
  }
  saveUser(user: Omit<UserAccount, 'id' | 'createdAt'> & { id?: string }): UserAccount {
    const list = this.getUsers()
    if (user.id) {
      const idx = list.findIndex((u) => u.id === user.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...user }
        this.setItem(STORAGE_KEYS.USERS, list)
        return list[idx]
      }
    }
    const newRecord: UserAccount = {
      ...user,
      id: `USR-${Date.now().toString().slice(-4)}`,
      status: user.status || 'Active',
      createdAt: new Date().toISOString(),
    }
    list.push(newRecord)
    this.setItem(STORAGE_KEYS.USERS, list)
    return newRecord
  }
  deleteUser(id: string): boolean {
    const list = this.getUsers().filter((u) => u.id !== id)
    this.setItem(STORAGE_KEYS.USERS, list)
    return true
  }

  // --- Programs ---
  getPrograms() {
    const raw = this.getItem(STORAGE_KEYS.PROGRAMS, defaultPrograms);
    const invalidCodes = new Set(['BSIT', 'BSBA', 'BSA', 'BSED', 'BEED', 'BSCRIM', 'BSHM']);
    const sanitized = (Array.isArray(raw) ? raw : []).filter(
      (p: any) => p && p.code && !invalidCodes.has(String(p.code).trim().toUpperCase())
    );
    if (sanitized.length === 0) {
      this.setItem(STORAGE_KEYS.PROGRAMS, defaultPrograms);
      return defaultPrograms;
    }
    if (sanitized.length !== raw.length) {
      this.setItem(STORAGE_KEYS.PROGRAMS, sanitized);
    }
    return sanitized;
  }
  saveProgram(prog: { code: string; name: string; focus: string }) {
    const list = this.getPrograms()
    const idx = list.findIndex((p) => p.code === prog.code)
    if (idx >= 0) {
      list[idx] = prog
    } else {
      list.push(prog)
    }
    this.setItem(STORAGE_KEYS.PROGRAMS, list)
    return prog
  }
  deleteProgram(code: string) {
    const list = this.getPrograms().filter((p) => p.code !== code)
    this.setItem(STORAGE_KEYS.PROGRAMS, list)
    return true
  }
  setPrograms(programs: any[]) {
    this.setItem(STORAGE_KEYS.PROGRAMS, programs)
  }

  // --- Faculty ---
  getFaculty(): FacultyMember[] {
    return this.getItem<FacultyMember[]>(STORAGE_KEYS.FACULTY, defaultFaculty)
  }
  saveFaculty(faculty: FacultyMember): FacultyMember {
    const list = this.getFaculty()
    const idx = list.findIndex((f) => f.id === faculty.id)
    if (idx >= 0) {
      list[idx] = faculty
    } else {
      list.push(faculty)
    }
    this.setItem(STORAGE_KEYS.FACULTY, list)
    return faculty
  }
  deleteFaculty(id: string): boolean {
    const list = this.getFaculty().filter((f) => f.id !== id)
    this.setItem(STORAGE_KEYS.FACULTY, list)
    return true
  }

  // --- Rooms ---
  getRooms(): RoomItem[] {
    return this.getItem<RoomItem[]>(STORAGE_KEYS.ROOMS, defaultRooms)
  }
  saveRoom(room: RoomItem): RoomItem {
    const list = this.getRooms()
    const idx = list.findIndex((r) => r.number.toUpperCase() === room.number.toUpperCase())
    if (idx >= 0) {
      list[idx] = room
    } else {
      list.push(room)
    }
    this.setItem(STORAGE_KEYS.ROOMS, list)
    return room
  }
  deleteRoom(number: string): boolean {
    const list = this.getRooms().filter((r) => r.number.toUpperCase() !== number.toUpperCase())
    this.setItem(STORAGE_KEYS.ROOMS, list)
    return true
  }

  // --- Subjects ---
  getSubjects(): SubjectItem[] {
    return this.getItem<SubjectItem[]>(STORAGE_KEYS.SUBJECTS, defaultSubjects)
  }
  saveSubject(subject: SubjectItem): SubjectItem {
    const list = this.getSubjects()
    const idx = list.findIndex((s) => s.code.toUpperCase() === subject.code.toUpperCase())
    if (idx >= 0) {
      list[idx] = subject
    } else {
      list.push(subject)
    }
    this.setItem(STORAGE_KEYS.SUBJECTS, list)
    return subject
  }
  deleteSubject(code: string): boolean {
    const list = this.getSubjects().filter((s) => s.code.toUpperCase() !== code.toUpperCase())
    this.setItem(STORAGE_KEYS.SUBJECTS, list)
    return true
  }

  // --- Sections ---
  getSections(): SectionItem[] {
    return this.getItem<SectionItem[]>(STORAGE_KEYS.SECTIONS, defaultSections)
  }
  saveSection(section: SectionItem): SectionItem {
    const list = this.getSections()
    const id = section.id || `SEC-${Date.now().toString().slice(-4)}`
    const record: SectionItem = { ...section, id }
    const idx = list.findIndex((s) => s.id === id || s.section === section.section)
    if (idx >= 0) {
      list[idx] = record
    } else {
      list.push(record)
    }
    this.setItem(STORAGE_KEYS.SECTIONS, list)
    return record
  }
  deleteSection(id: string): boolean {
    const list = this.getSections().filter((s) => s.id !== id && s.section !== id)
    this.setItem(STORAGE_KEYS.SECTIONS, list)
    return true
  }

  // --- Class Schedules ---
  getClassSchedules(): ClassScheduleItem[] {
    return this.getItem<ClassScheduleItem[]>(STORAGE_KEYS.CLASS_SCHEDULES, defaultClassSchedules)
  }
  saveClassSchedule(item: Omit<ClassScheduleItem, 'id'> & { id?: string }): ClassScheduleItem {
    const list = this.getClassSchedules()
    const id = item.id || `SCHED-${Date.now().toString().slice(-4)}`
    const record: ClassScheduleItem = { ...item, id }
    const idx = list.findIndex((s) => s.id === id)
    if (idx >= 0) {
      list[idx] = record
    } else {
      list.push(record)
    }
    this.setItem(STORAGE_KEYS.CLASS_SCHEDULES, list)
    return record
  }
  deleteClassSchedule(id: string): boolean {
    const list = this.getClassSchedules().filter((s) => s.id !== id)
    this.setItem(STORAGE_KEYS.CLASS_SCHEDULES, list)
    return true
  }

  // --- Exam Schedules ---
  getExamSchedules(): ExamScheduleItem[] {
    return this.getItem<ExamScheduleItem[]>(STORAGE_KEYS.EXAM_SCHEDULES, defaultExamSchedules)
  }
  saveExamSchedule(item: Omit<ExamScheduleItem, 'id'> & { id?: string }): ExamScheduleItem {
    const list = this.getExamSchedules()
    const id = item.id || `EXAM-${Date.now().toString().slice(-4)}`
    const record: ExamScheduleItem = { ...item, id }
    const idx = list.findIndex((e) => e.id === id)
    if (idx >= 0) {
      list[idx] = record
    } else {
      list.push(record)
    }
    this.setItem(STORAGE_KEYS.EXAM_SCHEDULES, list)
    return record
  }
  deleteExamSchedule(id: string): boolean {
    const list = this.getExamSchedules().filter((e) => e.id !== id)
    this.setItem(STORAGE_KEYS.EXAM_SCHEDULES, list)
    return true
  }

  // --- Conflicts Detection ---
  getConflicts(): ConflictItem[] {
    const schedules = this.getClassSchedules()
    const facultyList = this.getFaculty()
    const conflicts: ConflictItem[] = []

    // 1. Double Booking: Faculty at same day & time
    const facultySlotMap = new Map<string, ClassScheduleItem[]>()
    for (const item of schedules) {
      const key = `${item.facultyId || item.faculty}-${item.day}-${item.time}`
      if (!facultySlotMap.has(key)) facultySlotMap.set(key, [])
      facultySlotMap.get(key)!.push(item)
    }
    for (const [_, items] of facultySlotMap.entries()) {
      if (items.length > 1) {
        conflicts.push({
          id: `FAC-CLASH-${items[0].id}`,
          title: `Faculty Double-Booking: ${items[0].faculty}`,
          severity: 'High',
          detail: `${items[0].faculty} is assigned to ${items.length} classes on ${items[0].day} at ${items[0].time} (${items.map((i) => `${i.subject} [${i.section}]`).join(', ')}).`,
          suggestion: 'Reassign one of the classes to an alternate instructor or adjust the time slot.',
          type: 'faculty_clash',
        })
      }
    }

    // 2. Double Booking: Room at same day & time
    const roomSlotMap = new Map<string, ClassScheduleItem[]>()
    for (const item of schedules) {
      if (item.modality === 'Online') continue // Online classes don't clash on physical rooms
      const key = `${item.room}-${item.building}-${item.day}-${item.time}`
      if (!roomSlotMap.has(key)) roomSlotMap.set(key, [])
      roomSlotMap.get(key)!.push(item)
    }
    for (const [_, items] of roomSlotMap.entries()) {
      if (items.length > 1) {
        conflicts.push({
          id: `ROOM-CLASH-${items[0].id}`,
          title: `Room Collision: ${items[0].room} (${items[0].building})`,
          severity: 'High',
          detail: `${items[0].room} is booked for ${items.length} classes on ${items[0].day} at ${items[0].time} (${items.map((i) => `${i.subject} [${i.section}]`).join(', ')}).`,
          suggestion: 'Move one class to a free room in College, SHS, or JHS building.',
          type: 'room_clash',
        })
      }
    }

    // 3. Section Overlap: Section at same day & time
    const sectionSlotMap = new Map<string, ClassScheduleItem[]>()
    for (const item of schedules) {
      const key = `${item.section}-${item.day}-${item.time}`
      if (!sectionSlotMap.has(key)) sectionSlotMap.set(key, [])
      sectionSlotMap.get(key)!.push(item)
    }
    for (const [_, items] of sectionSlotMap.entries()) {
      if (items.length > 1) {
        conflicts.push({
          id: `SEC-CLASH-${items[0].id}`,
          title: `Section Overlap: ${items[0].section}`,
          severity: 'High',
          detail: `Section ${items[0].section} has overlapping subjects on ${items[0].day} at ${items[0].time} (${items.map((i) => i.subject).join(' vs ')}).`,
          suggestion: 'Shift one of the subjects to a different vacant time slot in the weekly matrix.',
          type: 'section_clash',
        })
      }
    }

    // 4. Part-Time Teacher Availability check
    for (const item of schedules) {
      const teacher = facultyList.find(
        (f) => f.id === item.facultyId || f.name.toLowerCase() === item.faculty.toLowerCase()
      )
      if (teacher && teacher.status === 'Part-Time' && teacher.availability) {
        const avail = teacher.availability.toLowerCase()
        const dayMatch = avail.includes(item.day.toLowerCase())
        if (!dayMatch) {
          conflicts.push({
            id: `AVAIL-CLASH-${item.id}`,
            title: `Part-Time Availability Conflict: ${teacher.name}`,
            severity: 'Medium',
            detail: `${teacher.name} is scheduled on ${item.day} for ${item.subject}, but their registered availability only permits: ${teacher.availability}.`,
            suggestion: 'Move the schedule to one of the instructor’s preferred teaching days and times.',
            type: 'availability_violation',
          })
        }
      }
    }

    return conflicts
  }
}

export const storage = new LocalStorageService()
storage.initSeedData()
