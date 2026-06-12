import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUserDashboardSummary, getMyPerformanceReport, getAppointmentsSummary,
  getPaymentSummary, getProductPriceDistributionSummary,
} from '../../src/services/report.js'

vi.mock('../../src/services/api.js', () => ({
  api: { get: vi.fn() },
}))

import { api } from '../../src/services/api.js'

beforeEach(() => vi.clearAllMocks())

describe('report service', () => {
  const params = { date_from: '2024-01-01', date_to: '2024-12-31' }

  it('getUserDashboardSummary() GETs /reports/user-dashboard-summary/ with params', async () => {
    api.get.mockResolvedValue({ data: {} })
    await getUserDashboardSummary(params)
    expect(api.get).toHaveBeenCalledWith('/reports/user-dashboard-summary/', { params })
  })

  it('getMyPerformanceReport() GETs /reports/my-performance/', async () => {
    api.get.mockResolvedValue({ data: {} })
    await getMyPerformanceReport(params)
    expect(api.get).toHaveBeenCalledWith('/reports/my-performance/', { params })
  })

  it('getAppointmentsSummary() GETs /reports/appointments-summary/', async () => {
    api.get.mockResolvedValue({ data: {} })
    await getAppointmentsSummary(params)
    expect(api.get).toHaveBeenCalledWith('/reports/appointments-summary/', { params })
  })

  it('getPaymentSummary() GETs /reports/payment-summary/', async () => {
    api.get.mockResolvedValue({ data: {} })
    await getPaymentSummary(params)
    expect(api.get).toHaveBeenCalledWith('/reports/payment-summary/', { params })
  })

  it('getProductPriceDistributionSummary() GETs /reports/product-price-distribution-summary/', async () => {
    api.get.mockResolvedValue({ data: {} })
    await getProductPriceDistributionSummary(params)
    expect(api.get).toHaveBeenCalledWith('/reports/product-price-distribution-summary/', { params })
  })

  it('propagates errors from api', async () => {
    api.get.mockRejectedValue(new Error('Network Error'))
    await expect(getUserDashboardSummary({})).rejects.toThrow('Network Error')
  })
})
