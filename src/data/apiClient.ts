import { storage } from './storage'

// Emulated API client with local storage backend for standalone offline-first operation
export const api = {
  async get(url: string): Promise<{ data: { success: boolean; data: any } }> {
    const cleanUrl = url.split('?')[0]

    if (cleanUrl === '/users') {
      return { data: { success: true, data: storage.getUsers() } }
    }
    if (cleanUrl === '/programs') {
      return { data: { success: true, data: storage.getPrograms() } }
    }
    if (cleanUrl === '/faculty') {
      return { data: { success: true, data: storage.getFaculty() } }
    }
    if (cleanUrl === '/rooms') {
      return { data: { success: true, data: storage.getRooms() } }
    }
    if (cleanUrl === '/subjects') {
      return { data: { success: true, data: storage.getSubjects() } }
    }
    if (cleanUrl === '/sections') {
      return { data: { success: true, data: storage.getSections() } }
    }
    if (cleanUrl === '/schedules') {
      return { data: { success: true, data: storage.getClassSchedules() } }
    }
    if (cleanUrl === '/schedules/conflicts') {
      return { data: { success: true, data: storage.getConflicts() } }
    }
    if (cleanUrl === '/exams' || cleanUrl === '/schedules/exams') {
      return { data: { success: true, data: storage.getExamSchedules() } }
    }

    return { data: { success: true, data: [] } }
  },

  async post(url: string, body?: any): Promise<{ data: { success: boolean; data?: any; token?: string; user?: any } }> {
    const cleanUrl = url.split('?')[0]

    if (cleanUrl === '/auth/login') {
      const email = body?.email?.toLowerCase().trim()
      const users = storage.getUsers()
      const user = users.find((u) => u.email.toLowerCase() === email) || {
        id: 'USR-TEMP',
        name: email.split('@')[0] || 'User',
        email,
        role: email.includes('super') ? 'super_admin' : email.includes('admin') ? 'admin' : email.includes('head') ? 'program_head' : 'teacher',
        status: 'Active',
      }
      return {
        data: {
          success: true,
          token: `token_${Date.now()}`,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            program: (user as any).program || 'BSIT',
            teacher: (user as any).teacherId ? storage.getFaculty().find(f => f.id === (user as any).teacherId) : null,
          },
        },
      }
    }

    if (cleanUrl === '/auth/register' || cleanUrl === '/users') {
      const created = storage.saveUser(body)
      return { data: { success: true, data: created } }
    }

    if (cleanUrl === '/programs') {
      const created = storage.saveProgram(body)
      return { data: { success: true, data: created } }
    }

    if (cleanUrl === '/faculty') {
      const created = storage.saveFaculty(body)
      return { data: { success: true, data: created } }
    }

    if (cleanUrl === '/rooms') {
      const created = storage.saveRoom(body)
      return { data: { success: true, data: created } }
    }

    if (cleanUrl === '/subjects') {
      const created = storage.saveSubject(body)
      return { data: { success: true, data: created } }
    }

    if (cleanUrl === '/sections') {
      const created = storage.saveSection(body)
      return { data: { success: true, data: created } }
    }

    if (cleanUrl === '/schedules') {
      const created = storage.saveClassSchedule(body)
      return { data: { success: true, data: created } }
    }

    if (cleanUrl === '/schedules/generate') {
      return { data: { success: true, data: storage.getClassSchedules() } }
    }

    if (cleanUrl === '/exams' || cleanUrl === '/schedules/exams') {
      const created = storage.saveExamSchedule(body)
      return { data: { success: true, data: created } }
    }

    return { data: { success: true, data: body } }
  },

  async put(url: string, body?: any): Promise<{ data: { success: boolean; data?: any } }> {
    const parts = url.split('/').filter(Boolean)
    const resource = parts[0]
    const id = decodeURIComponent(parts[1] || '')

    if (resource === 'users') {
      const updated = storage.saveUser({ ...body, id })
      return { data: { success: true, data: updated } }
    }
    if (resource === 'faculty') {
      const updated = storage.saveFaculty({ ...body, id: id || body.id })
      return { data: { success: true, data: updated } }
    }
    if (resource === 'rooms') {
      const updated = storage.saveRoom({ ...body, number: id || body.number })
      return { data: { success: true, data: updated } }
    }
    if (resource === 'subjects') {
      const updated = storage.saveSubject({ ...body, code: id || body.code })
      return { data: { success: true, data: updated } }
    }
    if (resource === 'sections') {
      const updated = storage.saveSection({ ...body, id })
      return { data: { success: true, data: updated } }
    }
    if (resource === 'schedules') {
      const updated = storage.saveClassSchedule({ ...body, id })
      return { data: { success: true, data: updated } }
    }
    if (resource === 'exams') {
      const updated = storage.saveExamSchedule({ ...body, id })
      return { data: { success: true, data: updated } }
    }

    return { data: { success: true, data: body } }
  },

  async delete(url: string): Promise<{ data: { success: boolean } }> {
    const parts = url.split('/').filter(Boolean)
    const resource = parts[0]
    const id = decodeURIComponent(parts[1] || '')

    if (resource === 'users') {
      storage.deleteUser(id)
      return { data: { success: true } }
    }
    if (resource === 'faculty') {
      storage.deleteFaculty(id)
      return { data: { success: true } }
    }
    if (resource === 'rooms') {
      storage.deleteRoom(id)
      return { data: { success: true } }
    }
    if (resource === 'subjects') {
      storage.deleteSubject(id)
      return { data: { success: true } }
    }
    if (resource === 'sections') {
      storage.deleteSection(id)
      return { data: { success: true } }
    }
    if (resource === 'schedules') {
      storage.deleteClassSchedule(id)
      return { data: { success: true } }
    }
    if (resource === 'exams') {
      storage.deleteExamSchedule(id)
      return { data: { success: true } }
    }

    return { data: { success: true } }
  },
}
