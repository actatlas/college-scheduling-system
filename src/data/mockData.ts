import type { ConflictItem, FacultyMember, MetricCard, RoomItem, ScheduleItem, SectionItem, SubjectItem } from '../types'
import { storage } from './storage'

export const dashboardMetrics: MetricCard[] = [
  { label: 'Total Faculty', value: '0', detail: 'From database', icon: '👩‍🏫', tone: 'royal' },
  { label: 'Total Subjects', value: '0', detail: 'From database', icon: '📘', tone: 'gold' },
  { label: 'Total Sections', value: '0', detail: 'From database', icon: '🏫', tone: 'navy' },
  { label: 'Total Rooms', value: '0', detail: 'From database', icon: '🪑', tone: 'slate' },
  { label: 'Total Schedules', value: '0', detail: 'From database', icon: '🗓️', tone: 'emerald' },
  { label: 'Schedule Conflicts', value: '0', detail: 'From database', icon: '⚠️', tone: 'amber' },
]

export const facultyData: FacultyMember[] = []
export const subjectsData: SubjectItem[] = []
export const roomsData: RoomItem[] = []
export const sectionsData: SectionItem[] = []
export const scheduleGrid: ScheduleItem[] = []
export const conflictsData: ConflictItem[] = []

export function refreshAll() {
  const facs = storage.getFaculty()
  const subs = storage.getSubjects()
  const rms = storage.getRooms()
  const secs = storage.getSections()
  const scheds = storage.getClassSchedules()
  const confs = storage.getConflicts()

  facultyData.splice(0, facultyData.length, ...facs)
  subjectsData.splice(0, subjectsData.length, ...subs)
  roomsData.splice(0, roomsData.length, ...rms)
  sectionsData.splice(0, sectionsData.length, ...secs)
  scheduleGrid.splice(0, scheduleGrid.length, ...scheds)
  conflictsData.splice(0, conflictsData.length, ...confs)

  dashboardMetrics[0].value = String(facs.length)
  dashboardMetrics[1].value = String(subs.length)
  dashboardMetrics[2].value = String(secs.length)
  dashboardMetrics[3].value = String(rms.length)
  dashboardMetrics[4].value = String(scheds.length)
  dashboardMetrics[5].value = String(confs.length)
}

refreshAll()
window.addEventListener('scheduling_storage_update', () => refreshAll())
