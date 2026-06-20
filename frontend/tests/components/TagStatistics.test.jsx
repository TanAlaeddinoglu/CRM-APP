import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TagStatistics from '../../src/components/TagStatistics.jsx'

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../src/services/customer.js', () => ({
  getCustomerTagStats: vi.fn(),
  getMyCustomerTagStats: vi.fn(),
}))

import { useAuth } from '../../src/context/AuthContext.jsx'
import { getCustomerTagStats, getMyCustomerTagStats } from '../../src/services/customer.js'

beforeEach(() => {
  vi.clearAllMocks()
})

const mockStats = {
  data: {
    total: 10,
    by_tag: [
      { tag__tag_name: 'VIP', count: 5 },
      { tag__tag_name: 'Regular', count: 3 },
      { tag__tag_name: null, count: 2 },
    ],
  },
}

describe('TagStatistics', () => {
  it('uses getCustomerTagStats for admin', async () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } })
    getCustomerTagStats.mockResolvedValue(mockStats)
    render(<TagStatistics />)
    await waitFor(() => expect(getCustomerTagStats).toHaveBeenCalled())
  })

  it('uses getMyCustomerTagStats for non-admin', async () => {
    useAuth.mockReturnValue({ user: { role: 'USER' } })
    getMyCustomerTagStats.mockResolvedValue(mockStats)
    render(<TagStatistics />)
    await waitFor(() => expect(getMyCustomerTagStats).toHaveBeenCalled())
  })

  it('renders tag stats after loading', async () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } })
    getCustomerTagStats.mockResolvedValue(mockStats)
    render(<TagStatistics />)
    await waitFor(() => {
      expect(screen.getByText(/VIP/)).toBeInTheDocument()
    })
  })

  it('shows Etiketsiz for null tag names', async () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } })
    getCustomerTagStats.mockResolvedValue(mockStats)
    render(<TagStatistics />)
    await waitFor(() => {
      expect(screen.getByText(/Etiketsiz/)).toBeInTheDocument()
    })
  })

  it('shows total count', async () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } })
    getCustomerTagStats.mockResolvedValue(mockStats)
    render(<TagStatistics />)
    await waitFor(() => {
      expect(screen.getByText(/10/)).toBeInTheDocument()
    })
  })

  it('handles API error gracefully by showing zero stats', async () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getCustomerTagStats.mockRejectedValue(new Error('fail'))
    render(<TagStatistics />)
    await waitFor(() => expect(consoleSpy).toHaveBeenCalled())
    expect(screen.getByText(/Toplam müşteri/)).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('falls back to empty stats when response data is missing', async () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } })
    getCustomerTagStats.mockResolvedValue({ data: null })
    render(<TagStatistics />)
    await waitFor(() => expect(screen.getByText(/Toplam müşteri/)).toBeInTheDocument())
    // total defaults to 0
    const totalItem = screen.getByText(/Toplam müşteri/).closest('.tag-stats-item')
    expect(totalItem).toHaveTextContent('0')
  })

  it('tolerates a missing by_tag array', async () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } })
    getCustomerTagStats.mockResolvedValue({ data: { total: 4 } })
    render(<TagStatistics />)
    await waitFor(() => expect(screen.getByText(/Toplam müşteri/)).toBeInTheDocument())
  })

  it('defaults a null count to 0', async () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } })
    getCustomerTagStats.mockResolvedValue({
      data: { total: 1, by_tag: [{ tag__tag_name: 'VIP', count: null }] },
    })
    render(<TagStatistics />)
    const vipItem = await screen.findByText(/VIP/)
    expect(vipItem.closest('.tag-stats-item')).toHaveTextContent('0')
  })
})
