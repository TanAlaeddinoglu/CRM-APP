import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAppointmentPayments, getAppointmentPaymentsByCustomer,
  createAppointmentPayment, updateAppointmentPayment, deleteAppointmentPayment,
  getAppointments, getAppointmentById,
} from '../../src/services/events.js'

vi.mock('../../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../../src/services/api.js'

beforeEach(() => vi.clearAllMocks())

describe('events service', () => {
  describe('payments', () => {
    it('getAppointmentPayments() GETs with params', async () => {
      api.get.mockResolvedValue({ data: { results: [] } })
      await getAppointmentPayments({ page: 2 })
      expect(api.get).toHaveBeenCalledWith('/events/appointment-payments/', { params: { page: 2 } })
    })

    it('getAppointmentPayments() works with no args', async () => {
      api.get.mockResolvedValue({ data: { results: [] } })
      await getAppointmentPayments()
      expect(api.get).toHaveBeenCalledWith('/events/appointment-payments/', { params: {} })
    })

    it('getAppointmentPaymentsByCustomer() filters by customer', async () => {
      api.get.mockResolvedValue({ data: { results: [] } })
      await getAppointmentPaymentsByCustomer(42)
      expect(api.get).toHaveBeenCalledWith('/events/appointment-payments/', {
        params: { customer: 42 },
      })
    })

    it('createAppointmentPayment() POSTs to /events/appointment-payments/', async () => {
      api.post.mockResolvedValue({ data: { id: 1 } })
      const payload = { appointment: 5, amount: 100 }
      await createAppointmentPayment(payload)
      expect(api.post).toHaveBeenCalledWith('/events/appointment-payments/', payload)
    })

    it('updateAppointmentPayment() PATCHes /:id/', async () => {
      api.patch.mockResolvedValue({ data: { id: 1 } })
      await updateAppointmentPayment(1, { amount: 200 })
      expect(api.patch).toHaveBeenCalledWith('/events/appointment-payments/1/', { amount: 200 })
    })

    it('deleteAppointmentPayment() DELETEs /:id/', async () => {
      api.delete.mockResolvedValue({})
      await deleteAppointmentPayment(1)
      expect(api.delete).toHaveBeenCalledWith('/events/appointment-payments/1/')
    })
  })

  describe('appointments', () => {
    it('getAppointments() GETs with params', async () => {
      api.get.mockResolvedValue({ data: { results: [] } })
      await getAppointments({ reminder: true })
      expect(api.get).toHaveBeenCalledWith('/events/appointments/', { params: { reminder: true } })
    })

    it('getAppointmentById() GETs /events/appointments/:id/', async () => {
      api.get.mockResolvedValue({ data: { id: 7 } })
      await getAppointmentById(7)
      expect(api.get).toHaveBeenCalledWith('/events/appointments/7/')
    })
  })
})
