export type UserRole = 'super_admin' | 'admin' | 'program_head'

export interface UserAccount {
  id: string
  name: string
  email: string
  role: UserRole
  program?: string
  status: 'Active' | 'Suspended'
  createdAt: string
  teacherId?: string
  facultyId?: string
}

export type PrivilegeType = 'MANAGE_EXAM_SCHEDULE' | 'MANAGE_CLASS_SCHEDULE' | 'ROOM_REALLOCATION'

export type DelegationStatus = 'ACTIVE' | 'REVOKED'

export interface DelegationRecord {
  id?: number | string
  delegation_id?: number | string
  userId?: number | string
  user_id?: number | string
  programCode?: string
  program_code?: string
  privilegeType?: PrivilegeType
  privilege_type?: PrivilegeType
  status: DelegationStatus
  grantedBy?: number | string
  granted_by?: number | string
  updatedAt?: string
  updated_at?: string
  createdAt?: string
  created_at?: string
}

export interface ProgramHeadDelegation {
  userId: number | string
  userName: string
  userEmail: string
  programCode: string
  programName?: string
  userStatus?: string
  delegations?: DelegationRecord[]
  grantedPrivileges: PrivilegeType[]
  hasExamSchedulePrivilege: boolean
  hasClassSchedulePrivilege: boolean
  hasRoomReallocationPrivilege: boolean
}

export interface FacultyDispatchItem {
  subjectCode: string
  subjectName: string
  section: string
  day: string
  time: string
  room: string
  mode: string
  durationHours: string
}

export interface FacultyDispatchPayload {
  to: string
  from: string
  subject: string
  facultyName: string
  facultyEmail: string
  department: string
  academicTerm: string
  totalWeeklyHours: number
  totalUnits: number
  subjectCount: number
  scheduleItems: FacultyDispatchItem[]
  cubicleAdvisoryNote: string
  customNotes?: string | null
  dispatchedAt: string
  deliveryStatus: 'Sent' | 'Delivered' | 'Error'
}

export type ClassModality = 'Face-to-Face' | 'Online'

export type ExamTerm = 'Prelim' | 'Midterm' | 'Semi-Final' | 'Final'

export interface DayItem {
  id: number
  name: string
}

export interface MajorItem {
  id: string | number
  code: string
  name: string
  programCode: string
  programHeadId?: string | number
}

export interface FacultyMember {
  id: string
  name: string
  firstName?: string
  lastName?: string
  employeeNumber?: string
  position?: string
  department: string
  departmentCode?: string
  email: string
  phone: string
  status: 'Full-Time' | 'Part-Time'
  facultyType: 'Full-Time' | 'Part-Time'
  availability?: string
  maxLoadHours?: number
  subjects: string[]
  programs?: string[]
}

export interface SubjectItem {
  code: string
  name: string
  subjectTitle?: string
  units: number
  lectureHours: number
  labHours: number
  subjectType?: 'Major Lecture' | 'Major Laboratory' | 'Minor' | 'General Education' | string
  semester: string
  department: string
  program?: string
  programCode?: string
  majorId?: string | number
  courseCode?: string
  isMajor?: boolean
  isGeneralEducation?: boolean
  classification?: string
  status?: string
  instructor: string
  instructorId?: string
}

export type BuildingType = string

export interface RoomItem {
  number: string
  code?: string
  name?: string
  roomName?: string
  capacity: number
  building?: string
  type: 'Lecture' | 'Laboratory' | 'Computer Laboratory' | 'Science Laboratory' | 'Audio-Visual' | 'Athletic' | 'Online' | string
  status: 'Available' | 'Reserved' | 'Maintenance' | 'active' | string
}

export interface SectionItem {
  id?: string
  program?: string
  programCode?: string
  programName?: string
  majorId?: string | number
  majorCode?: string
  majorName?: string
  course?: string
  courseCode?: string
  yearLevel: string
  section: string
  sectionLabel?: string
  sectionName?: string
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
  dayId?: number
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
  building?: string
  classMode?: string // e.g. "Lecture" | "Laboratory" | "Online" | "Face-to-Face"
  yearLevel?: string
  course?: string
  program?: string
  semester?: string
  academicYear?: string
  modality: ClassModality
  onlineLink?: string
  isMajor?: boolean
  color: string
  status?: 'Confirmed' | 'Draft'
  isCombinedCohort?: boolean
}

export interface ExamScheduleItem {
  id: string
  term: ExamTerm
  examPeriod?: ExamTerm | string
  examDate: string // e.g. "2026-10-15"
  time: string // e.g. "08:00-10:00"
  startTime?: string
  endTime?: string
  subjectCode: string
  subject: string
  synchronizedSections: string[] // List of section names taking exam simultaneously
  room: string
  building?: string
  proctor: string
  proctorId?: string
  program?: string
  classMode?: string
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
  description?: string
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

export type RequestedSchedulingAction = 'CREATE_SCHEDULE' | 'MODIFY_SCHEDULE' | 'DELETE_SCHEDULE' | 'SCHEDULE_ADJUSTMENT'

export interface ScheduleAdjustmentRequest {
  id: number
  scheduleId?: number | null
  requestedByUserId: number
  requesterName: string
  requesterProgram: string
  programCode?: string
  programId?: string
  subjectCode: string
  subjectName: string
  sectionName?: string
  sectionId?: string | number
  facultyName?: string
  roomNumber?: string
  currentDay?: string
  currentStartTime?: string
  currentEndTime?: string
  suggestedDay?: string
  suggestedStartTime?: string
  suggestedEndTime?: string
  suggestedRoom?: string
  requestedAction?: RequestedSchedulingAction
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  adminResponse?: string | null
  adminRemarks?: string | null
  reviewedByUserId?: number | null
  reviewedByName?: string | null
  reviewedAt?: string | null
  createdAt: string
  updatedAt: string
}
