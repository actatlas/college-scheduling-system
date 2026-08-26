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
    name: 'Mr. Juan Dela Cruz',
    email: 'faculty.fulltime@srcb.edu.ph',
    role: 'teacher',
    teacherId: 'FAC-001',
    status: 'Active',
    createdAt: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'USR-006',
    name: 'Engr. Roberto Santos (Part-Time)',
    email: 'faculty.parttime@srcb.edu.ph',
    role: 'teacher',
    teacherId: 'FAC-002',
    status: 'Active',
    createdAt: '2026-02-05T08:00:00.000Z',
  },
]

const defaultPrograms = [
  { code: 'BSIT', name: 'Bachelor of Science in Information Technology', focus: 'Software Development & Systems Administration' },
  { code: 'BSBA', name: 'Bachelor of Science in Business Administration', focus: 'Marketing & Financial Management' },
  { code: 'BSED', name: 'Bachelor of Secondary Education', focus: 'Secondary Curriculum & Pedagogy' },
  { code: 'BEED', name: 'Bachelor of Elementary Education', focus: 'Early Childhood & Primary Education' },
  { code: 'BSCrim', name: 'Bachelor of Science in Criminology', focus: 'Law Enforcement & Forensic Studies' },
  { code: 'BSHM', name: 'Bachelor of Science in Hospitality Management', focus: 'Hotel & Culinary Operations' },
]

const defaultFaculty: FacultyMember[] = [
  {
    id: 'FAC-001',
    name: 'Mr. Juan Dela Cruz',
    department: 'Information Technology',
    email: 'faculty.fulltime@srcb.edu.ph',
    phone: '09171234567',
    status: 'Full-Time',
    availability: 'Monday-Friday: 08:00-17:00',
    maxLoadHours: 24,
    subjects: ['IT101', 'IT201'],
    programs: ['BSIT'],
  },
  {
    id: 'FAC-002',
    name: 'Engr. Roberto Santos (Part-Time)',
    department: 'Information Technology',
    email: 'faculty.parttime@srcb.edu.ph',
    phone: '09187654321',
    status: 'Part-Time',
    availability: 'Monday: 08:00-09:00, 09:00-10:00, 10:00-11:00 | Wednesday: 08:00-09:00, 09:00-10:00, 10:00-11:00 | Friday: 01:00-02:00, 02:00-03:00, 03:00-04:00',
    maxLoadHours: 12,
    subjects: ['IT102', 'IT301'],
    programs: ['BSIT'],
  },
  {
    id: 'FAC-003',
    name: 'Dr. Alan Turing',
    department: 'Information Technology',
    email: 'head.it@srcb.edu.ph',
    phone: '09191112233',
    status: 'Full-Time',
    availability: 'Monday-Friday: 08:00-17:00',
    maxLoadHours: 18,
    subjects: ['IT401', 'GE103'],
    programs: ['BSIT'],
  },
  {
    id: 'FAC-004',
    name: 'Prof. Mary Cruz',
    department: 'Business Administration',
    email: 'head.ba@srcb.edu.ph',
    phone: '09204445566',
    status: 'Full-Time',
    availability: 'Monday-Friday: 08:00-17:00',
    maxLoadHours: 21,
    subjects: ['BA101', 'BA201'],
    programs: ['BSBA'],
  },
  {
    id: 'FAC-005',
    name: 'Dr. Grace Hopper (Part-Time)',
    department: 'Information Technology',
    email: 'hopper@srcb.edu.ph',
    phone: '09228889900',
    status: 'Part-Time',
    availability: 'Tuesday: 08:00-09:00, 09:00-10:00, 10:00-11:00 | Thursday: 08:00-09:00, 09:00-10:00, 10:00-11:00',
    maxLoadHours: 12,
    subjects: ['IT201'],
    programs: ['BSIT'],
  },
  {
    id: 'FAC-006',
    name: 'Mrs. Elena Ramos',
    department: 'General Education',
    email: 'ramos@srcb.edu.ph',
    phone: '09175556677',
    status: 'Full-Time',
    availability: 'Monday-Friday: 08:00-17:00',
    maxLoadHours: 24,
    subjects: ['GE101', 'GE102'],
    programs: ['BSIT', 'BSBA', 'BSED'],
  },
  {
    id: 'FAC-007',
    name: 'Mr. Baltazar',
    department: 'Religious Studies / Gen Ed',
    email: 'baltazar@srcb.edu.ph',
    phone: '09179998877',
    status: 'Full-Time',
    availability: 'Monday-Friday: 08:00-17:00',
    maxLoadHours: 24,
    subjects: ['RS1'],
    programs: ['BSIT', 'BSBA', 'BSED', 'BEED', 'BSCrim', 'BSHM'],
  },
]

const defaultRooms: RoomItem[] = [
  // College Building
  { number: 'COL-101', capacity: 45, building: 'College Building', type: 'Lecture', status: 'Available' },
  { number: 'COL-102', capacity: 45, building: 'College Building', type: 'Lecture', status: 'Available' },
  { number: 'COL-201', capacity: 50, building: 'College Building', type: 'Lecture', status: 'Available' },
  { number: 'COMLAB-1', capacity: 40, building: 'College Building', type: 'Computer Laboratory', status: 'Available' },
  { number: 'COMLAB-2', capacity: 40, building: 'College Building', type: 'Computer Laboratory', status: 'Available' },
  { number: 'COL-AVR', capacity: 120, building: 'College Building', type: 'AVR', status: 'Available' },
  { number: 'SCI-LAB1', capacity: 35, building: 'College Building', type: 'Science Laboratory', status: 'Available' },

  // SHS Building
  { number: 'SHS-101', capacity: 45, building: 'SHS Building', type: 'Lecture', status: 'Available' },
  { number: 'SHS-102', capacity: 45, building: 'SHS Building', type: 'Lecture', status: 'Available' },
  { number: 'SHS-COMLAB', capacity: 40, building: 'SHS Building', type: 'Computer Laboratory', status: 'Available' },
  { number: 'SHS-AVR', capacity: 80, building: 'SHS Building', type: 'AVR', status: 'Available' },

  // JHS Building
  { number: 'JHS-201', capacity: 45, building: 'JHS Building', type: 'Lecture', status: 'Available' },
  { number: 'JHS-202', capacity: 45, building: 'JHS Building', type: 'Lecture', status: 'Available' },
  { number: 'JHS-SCILAB', capacity: 40, building: 'JHS Building', type: 'Science Laboratory', status: 'Available' },
]

const defaultSubjects: SubjectItem[] = [
  { code: 'IT101', name: 'Computer Programming 1', units: 3, lectureHours: 2, labHours: 3, semester: '1st Semester', department: 'Information Technology', program: 'BSIT', isMajor: true, instructor: 'Mr. Juan Dela Cruz', instructorId: 'FAC-001' },
  { code: 'IT102', name: 'Data Structures and Algorithms', units: 3, lectureHours: 2, labHours: 3, semester: '1st Semester', department: 'Information Technology', program: 'BSIT', isMajor: true, instructor: 'Engr. Roberto Santos (Part-Time)', instructorId: 'FAC-002' },
  { code: 'IT201', name: 'Database Management Systems', units: 3, lectureHours: 2, labHours: 3, semester: '1st Semester', department: 'Information Technology', program: 'BSIT', isMajor: true, instructor: 'Mr. Juan Dela Cruz', instructorId: 'FAC-001' },
  { code: 'IT301', name: 'Web Systems and Technologies', units: 3, lectureHours: 2, labHours: 3, semester: '1st Semester', department: 'Information Technology', program: 'BSIT', isMajor: true, instructor: 'Engr. Roberto Santos (Part-Time)', instructorId: 'FAC-002' },
  { code: 'IT401', name: 'Capstone Project 1', units: 3, lectureHours: 3, labHours: 0, semester: '1st Semester', department: 'Information Technology', program: 'BSIT', isMajor: true, instructor: 'Dr. Alan Turing', instructorId: 'FAC-003' },
  { code: 'BA101', name: 'Principles of Management', units: 3, lectureHours: 3, labHours: 0, semester: '1st Semester', department: 'Business Administration', program: 'BSBA', isMajor: true, instructor: 'Prof. Mary Cruz', instructorId: 'FAC-004' },
  { code: 'BA201', name: 'Marketing Management', units: 3, lectureHours: 3, labHours: 0, semester: '1st Semester', department: 'Business Administration', program: 'BSBA', isMajor: true, instructor: 'Prof. Mary Cruz', instructorId: 'FAC-004' },
  { code: 'GE101', name: 'Understanding the Self', units: 3, lectureHours: 3, labHours: 0, semester: '1st Semester', department: 'General Education', program: 'BSIT', isMajor: false, instructor: 'Mrs. Elena Ramos', instructorId: 'FAC-006' },
  { code: 'GE102', name: 'Purposive Communication', units: 3, lectureHours: 3, labHours: 0, semester: '1st Semester', department: 'General Education', program: 'BSIT', isMajor: false, instructor: 'Mrs. Elena Ramos', instructorId: 'FAC-006' },
  { code: 'GE103', name: 'Mathematics in the Modern World', units: 3, lectureHours: 3, labHours: 0, semester: '1st Semester', department: 'General Education', program: 'BSIT', isMajor: false, instructor: 'Dr. Alan Turing', instructorId: 'FAC-003' },
  { code: 'RS1', name: 'Religious Studies 1 (Peace & Christian Ethics)', units: 3, lectureHours: 3, labHours: 0, semester: '1st Semester', department: 'General Education', program: 'BSIT', isMajor: false, instructor: 'Mr. Baltazar', instructorId: 'FAC-007' },
]

const defaultSections: SectionItem[] = [
  { id: 'SEC-001', course: 'BSIT', program: 'BSIT', yearLevel: '1', section: 'BSIT 1-A', adviser: 'Mr. Juan Dela Cruz', adviserId: 'FAC-001', students: 38, semester: '1st Semester', schoolYear: '2026-2027' },
  { id: 'SEC-002', course: 'BSIT', program: 'BSIT', yearLevel: '1', section: 'BSIT 1-B', adviser: 'Engr. Roberto Santos (Part-Time)', adviserId: 'FAC-002', students: 35, semester: '1st Semester', schoolYear: '2026-2027' },
  { id: 'SEC-003', course: 'BSIT', program: 'BSIT', yearLevel: '2', section: 'BSIT 2-A', adviser: 'Dr. Alan Turing', adviserId: 'FAC-003', students: 32, semester: '1st Semester', schoolYear: '2026-2027' },
  { id: 'SEC-004', course: 'BSIT', program: 'BSIT', yearLevel: '3', section: 'BSIT 3-A', adviser: 'Mr. Juan Dela Cruz', adviserId: 'FAC-001', students: 30, semester: '1st Semester', schoolYear: '2026-2027' },
  { id: 'SEC-005', course: 'BSBA', program: 'BSBA', yearLevel: '1', section: 'BSBA 1-A', adviser: 'Prof. Mary Cruz', adviserId: 'FAC-004', students: 40, semester: '1st Semester', schoolYear: '2026-2027' },
]

const defaultClassSchedules: ClassScheduleItem[] = [
  {
    id: 'SCHED-001',
    day: 'Monday',
    time: '08:00-09:30',
    subjectCode: 'IT101',
    subject: 'Computer Programming 1',
    section: 'BSIT 1-A',
    faculty: 'Mr. Juan Dela Cruz',
    facultyId: 'FAC-001',
    room: 'COMLAB-1',
    building: 'College Building',
    modality: 'Face-to-Face',
    isMajor: true,
    program: 'BSIT',
    color: '#0284c7',
    status: 'Confirmed',
  },
  {
    id: 'SCHED-002',
    day: 'Wednesday',
    time: '08:00-09:30',
    subjectCode: 'IT101',
    subject: 'Computer Programming 1 (Lab)',
    section: 'BSIT 1-A',
    faculty: 'Mr. Juan Dela Cruz',
    facultyId: 'FAC-001',
    room: 'COMLAB-1',
    building: 'College Building',
    modality: 'Face-to-Face',
    isMajor: true,
    program: 'BSIT',
    color: '#0284c7',
    status: 'Confirmed',
  },
  {
    id: 'SCHED-003',
    day: 'Monday',
    time: '10:00-11:30',
    subjectCode: 'IT102',
    subject: 'Data Structures and Algorithms',
    section: 'BSIT 1-B',
    faculty: 'Engr. Roberto Santos (Part-Time)',
    facultyId: 'FAC-002',
    room: 'COMLAB-2',
    building: 'College Building',
    modality: 'Face-to-Face',
    isMajor: true,
    program: 'BSIT',
    color: '#0d9488',
    status: 'Confirmed',
  },
  {
    id: 'SCHED-004',
    day: 'Wednesday',
    time: '10:00-11:30',
    subjectCode: 'IT102',
    subject: 'Data Structures and Algorithms (Online)',
    section: 'BSIT 1-B',
    faculty: 'Engr. Roberto Santos (Part-Time)',
    facultyId: 'FAC-002',
    room: 'Virtual Room A',
    building: 'College Building',
    modality: 'Online',
    onlineLink: 'https://meet.google.com/srcb-it102-ds',
    isMajor: true,
    program: 'BSIT',
    color: '#0d9488',
    status: 'Confirmed',
  },
  {
    id: 'SCHED-005',
    day: 'Tuesday',
    time: '08:00-09:30',
    subjectCode: 'GE101',
    subject: 'Understanding the Self',
    section: 'BSIT 1-A',
    faculty: 'Mrs. Elena Ramos',
    facultyId: 'FAC-006',
    room: 'COL-101',
    building: 'College Building',
    modality: 'Face-to-Face',
    isMajor: false,
    program: 'BSIT',
    color: '#f59e0b',
    status: 'Confirmed',
  },
  {
    id: 'SCHED-006',
    day: 'Thursday',
    time: '08:00-09:30',
    subjectCode: 'GE101',
    subject: 'Understanding the Self (Online Lecture)',
    section: 'BSIT 1-A',
    faculty: 'Mrs. Elena Ramos',
    facultyId: 'FAC-006',
    room: 'Virtual Room B',
    building: 'College Building',
    modality: 'Online',
    onlineLink: 'https://meet.google.com/srcb-ge101-lec',
    isMajor: false,
    program: 'BSIT',
    color: '#f59e0b',
    status: 'Confirmed',
  },
  {
    id: 'SCHED-007',
    day: 'Tuesday',
    time: '10:00-11:30',
    subjectCode: 'BA101',
    subject: 'Principles of Management',
    section: 'BSBA 1-A',
    faculty: 'Prof. Mary Cruz',
    facultyId: 'FAC-004',
    room: 'SHS-101',
    building: 'SHS Building',
    modality: 'Face-to-Face',
    isMajor: true,
    program: 'BSBA',
    color: '#8b5cf6',
    status: 'Confirmed',
  },
  {
    id: 'SCHED-008',
    day: 'Tuesday',
    time: '08:00-09:30',
    subjectCode: 'IT301',
    subject: 'Web Systems and Technologies',
    section: 'BSIT 3-A',
    faculty: 'Dr. Alan Turing',
    facultyId: 'FAC-003',
    room: 'COMLAB-2',
    building: 'College Building',
    modality: 'Face-to-Face',
    isMajor: true,
    program: 'BSIT',
    color: '#6366f1',
    status: 'Confirmed',
  },
  {
    id: 'SCHED-009',
    day: 'Thursday',
    time: '08:00-09:30',
    subjectCode: 'IT301',
    subject: 'Web Systems and Technologies (Lab)',
    section: 'BSIT 3-A',
    faculty: 'Dr. Alan Turing',
    facultyId: 'FAC-003',
    room: 'COMLAB-2',
    building: 'College Building',
    modality: 'Face-to-Face',
    isMajor: true,
    program: 'BSIT',
    color: '#6366f1',
    status: 'Confirmed',
  },
]

const defaultExamSchedules: ExamScheduleItem[] = [
  {
    id: 'EXAM-001',
    term: 'Midterm',
    examDate: '2026-10-15',
    time: '08:00-10:00',
    subjectCode: 'IT101',
    subject: 'Computer Programming 1',
    synchronizedSections: ['BSIT 1-A', 'BSIT 1-B'],
    room: 'COMLAB-1 & COMLAB-2',
    building: 'College Building',
    proctor: 'Mr. Juan Dela Cruz',
    proctorId: 'FAC-001',
    program: 'BSIT',
    color: '#0284c7',
  },
  {
    id: 'EXAM-002',
    term: 'Midterm',
    examDate: '2026-10-15',
    time: '10:30-12:30',
    subjectCode: 'GE101',
    subject: 'Understanding the Self',
    synchronizedSections: ['BSIT 1-A', 'BSIT 1-B', 'BSBA 1-A'],
    room: 'COL-AVR',
    building: 'College Building',
    proctor: 'Mrs. Elena Ramos',
    proctorId: 'FAC-006',
    program: 'BSIT',
    color: '#f59e0b',
  },
  {
    id: 'EXAM-003',
    term: 'Midterm',
    examDate: '2026-10-16',
    time: '08:00-10:00',
    subjectCode: 'IT102',
    subject: 'Data Structures and Algorithms',
    synchronizedSections: ['BSIT 1-A', 'BSIT 1-B'],
    room: 'SHS-COMLAB',
    building: 'SHS Building',
    proctor: 'Engr. Roberto Santos (Part-Time)',
    proctorId: 'FAC-002',
    program: 'BSIT',
    color: '#0d9488',
  },
]

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
      localStorage.setItem(key, JSON.stringify(val))
      this.notifyListeners()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Storage write error', e)
    }
  }

  initSeedData(forceReset = false) {
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
    return this.getItem(STORAGE_KEYS.PROGRAMS, defaultPrograms)
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
