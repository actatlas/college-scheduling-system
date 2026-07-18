export interface FacultyMember {
  id: string
  name: string
  department: string
  email: string
  phone: string
  status: 'Full-Time' | 'Part-Time'
  availability: string
  subjects: string[]
}

export interface SubjectItem {
  code: string
  name: string
  units: number
  lectureHours: number
  labHours: number
  semester: string
  department: string
  instructor: string
}

export interface RoomItem {
  number: string
  capacity: number
  building: string
  type: string
  status: 'Available' | 'Reserved' | 'Maintenance'
}

export interface SectionItem {
  course: string
  yearLevel: string
  section: string
  adviser: string
  students: number
  semester: string
  schoolYear: string
}

export interface ScheduleItem {
  day: string
  time: string
  subject: string
  faculty: string
  room: string
  color: string
}

export interface ConflictItem {
  title: string
  severity: 'High' | 'Medium' | 'Low'
  detail: string
  suggestion: string
}

export interface MetricCard {
  label: string
  value: string
  detail: string
  icon: string
  tone: string
}
