export type UserRole = 'super_admin' | 'admin' | 'program_head' | 'teacher'

export interface UserAccount {
  id: string
  name: string
  email: string
  role: UserRole
  program?: string
  status: 'Active' | 'Suspended'
  createdAt: string
  teacherId?: string
}

export type BuildingType = 'College Building' | 'SHS Building' | 'JHS Building'

export type ClassModality = 'Face-to-Face' | 'Online'

export type ExamTerm = 'Prelim' | 'Midterm' | 'Semi-Final' | 'Final'

export interface FacultyMember {
  id: string
  name: string
  department: string
  email: string
  phone: string
  status: 'Full-Time' | 'Part-Time'
  availability: string // e.g. "Monday: 08:00-12:00 | Tuesday: 13:00-17:00"
  maxLoadHours?: number
  subjects: string[]
  programs?: string[]
}

export interface SubjectItem {
  code: string
  name: string
  units: number
  lectureHours: number
  labHours: number
  semester: string
  department: string
  program?: string
  courseCode?: string
  isMajor?: boolean
  isGeneralEducation?: boolean
  classification?: string
  status?: string
  instructor: string
  instructorId?: string
}

export interface RoomItem {
  number: string
  capacity: number
  building: BuildingType | string
  type: 'Lecture' | 'Laboratory' | 'Computer Laboratory' | 'Science Laboratory' | 'AVR' | string
  status: 'Available' | 'Reserved' | 'Maintenance'
}

export interface SectionItem {
  id?: string
  course: string
  program?: string
  yearLevel: string
  section: string
  adviser?: string
  adviserId?: string
  students: number
  semester: string
  schoolYear: string
  status?: string
}

export interface ClassScheduleItem {
  id: string
  day: string
  time: string // e.g. "08:00-09:30"
  startTime?: string
  endTime?: string
  subjectCode: string
  subject: string
  section: string
  sectionId?: string
  faculty: string
  facultyId?: string
  room: string
  roomType?: string
  building: BuildingType | string
  classMode?: string // e.g. "Lecture" | "Laboratory"
  yearLevel?: string
  course?: string
  semester?: string
  academicYear?: string
  modality: ClassModality
  onlineLink?: string
  isMajor?: boolean
  program?: string
  color: string
  status?: 'Confirmed' | 'Draft'
  isCombinedCohort?: boolean
}

export interface ExamScheduleItem {
  id: string
  term: ExamTerm
  examDate: string // e.g. "2026-10-15"
  time: string // e.g. "08:00-10:00"
  subjectCode: string
  subject: string
  synchronizedSections: string[] // List of section names taking exam simultaneously
  room: string
  building: BuildingType | string
  proctor: string
  proctorId?: string
  program?: string
  color?: string
}

export interface ConflictItem {
  id?: string
  title: string
  severity: 'High' | 'Medium' | 'Low'
  detail: string
  suggestion: string
  type?: 'faculty_clash' | 'room_clash' | 'section_clash' | 'availability_violation' | 'overload'
}

export interface MetricCard {
  label: string
  value: string
  detail: string
  icon: string
  tone: string
}

export interface ProgramItem {
  code: string
  name: string
  focus?: string
}

export interface CourseItem {
  code: string
  name: string
  department?: string
  program?: string
  programCode?: string
}

// Backwards compatibility alias
export type ScheduleItem = ClassScheduleItem
