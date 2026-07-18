import type { ConflictItem, FacultyMember, MetricCard, RoomItem, ScheduleItem, SectionItem, SubjectItem } from '../types'

import { api } from './mockApi'

// NOTE: UI components import these named exports.
// This file keeps the same export names/types but populates them from the backend.

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

export async function refreshAll() {
  const [facultyRes, subjectsRes, roomsRes, sectionsRes, schedulesRes] = await Promise.allSettled([
    api.get('/faculty'),
    api.get('/subjects'),
    api.get('/rooms'),
    api.get('/sections'),
    api.get('/schedules'),
  ])

  if (facultyRes.status === 'fulfilled') {
    facultyData.splice(0, facultyData.length, ...(facultyRes.value.data?.data || []))
  }
  if (subjectsRes.status === 'fulfilled') {
    subjectsData.splice(0, subjectsData.length, ...(subjectsRes.value.data?.data || []))
  }
  if (roomsRes.status === 'fulfilled') {
    roomsData.splice(0, roomsData.length, ...(roomsRes.value.data?.data || []))
  }
  if (sectionsRes.status === 'fulfilled') {
    sectionsData.splice(0, sectionsData.length, ...(sectionsRes.value.data?.data || []))
  }
  if (schedulesRes.status === 'fulfilled') {
    scheduleGrid.splice(0, scheduleGrid.length, ...(schedulesRes.value.data?.data || []))
  }

  // Basic dashboard metrics derived from fetched data.
  dashboardMetrics[0].value = String(facultyData.length)
  dashboardMetrics[1].value = String(subjectsData.length)
  dashboardMetrics[2].value = String(sectionsData.length)
  dashboardMetrics[3].value = String(roomsData.length)
  dashboardMetrics[4].value = String(scheduleGrid.length)

  // Conflicts are not implemented in backend yet; keep empty for now.
  dashboardMetrics[5].value = String(conflictsData.length)
}

// Load immediately when module is imported.
// Pages do not use async logic; this keeps UI code unchanged.
void refreshAll()

