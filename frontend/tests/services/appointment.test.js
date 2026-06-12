import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAppointments, getAppointment, createAppointment,
  updateAppointment, deleteAppointment,
} from '../../src/services/appointment.js'

vi.mock('../../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../../src/services/api.js'

beforeEach(() => vi.clearAllMocks())

describe('appointment service', () => {
  it('getAppointments() GETs with default empty params', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    await getAppointments()
    expect(api.get).toHaveBeenCalledWith('/events/appointments/', { params: {} })
  })

  it('getAppointments() forwards filter params', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    await getAppointments({ date_from: '2024-01-01', reminder: true })
    expect(api.get).toHaveBeenCalledWith('/events/appointments/', {
      params: { date_from: '2024-01-01', reminder: true },
    })
  })

  it('getAppointment() GETs /events/appointments/:id/', async () => {
    api.get.mockResolvedValue({ data: { id: 5 } })
    await getAppointment(5)
    expect(api.get).toHaveBeenCalledWith('/events/appointments/5/')
  })

  it('createAppointment() POSTs to /events/appointments/', async () => {
    api.post.mockResolvedValue({ data: { id: 10 } })
    const data = { customer: 1, scheduled_for: '2024-03-01T10:00:00Z' }
    await createAppointment(data)
    expect(api.post).toHaveBeenCalledWith('/events/appointments/', data)
  })

  it('updateAppointment() PATCHes /events/appointments/:id/', async () => {
    api.patch.mockResolvedValue({ data: { id: 10 } })
    await updateAppointment(10, { notes: 'updated' })
    expect(api.patch).toHaveBeenCalledWith('/events/appointments/10/', { notes: 'updated' })
  })

  it('deleteAppointment() DELETEs /events/appointments/:id/', async () => {
    api.delete.mockResolvedValue({})
    await deleteAppointment(10)
    expect(api.delete).toHaveBeenCalledWith('/events/appointments/10/')
  })
})
