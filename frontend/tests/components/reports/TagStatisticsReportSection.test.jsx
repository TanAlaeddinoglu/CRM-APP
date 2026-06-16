import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TagStatisticsReportSection from '../../../src/components/reports/TagStatisticsReportSection.jsx'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Cell: () => null,
}))

vi.mock('../../../src/services/customer.js', () => ({
  getCustomerTagStats: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { getCustomerTagStats } from '../../../src/services/customer.js'
import toast from 'react-hot-toast'

beforeEach(() => vi.clearAllMocks())

const defaultProps = {
  userOptions: [
    { value: '1', label: 'Ali Veli (ali)' },
    { value: '2', label: 'Zeynep Kaya (zeynep)' },
  ],
  optionsLoading: false,
}

const statsWithTags = {
  total: 30,
  by_tag: [
    { tag__tag_name: 'Sıcak', count: 20 },
    { tag__tag_name: 'Soğuk', count: 10 },
  ],
}

describe('TagStatisticsReportSection', () => {
  describe('initial render', () => {
    it('renders the filter panel and submit button', () => {
      render(<TagStatisticsReportSection {...defaultProps} />)
      expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
    })

    it('renders Temizle (reset) button', () => {
      render(<TagStatisticsReportSection {...defaultProps} />)
      expect(screen.getByText('Temizle')).toBeInTheDocument()
    })

    it('renders user options in select', () => {
      render(<TagStatisticsReportSection {...defaultProps} />)
      expect(screen.getByText('Ali Veli (ali)')).toBeInTheDocument()
      expect(screen.getByText('Zeynep Kaya (zeynep)')).toBeInTheDocument()
    })

    it('shows "Tüm kullanıcılar" placeholder when no user selected', () => {
      render(<TagStatisticsReportSection {...defaultProps} />)
      expect(screen.getByText('Tüm kullanıcılar')).toBeInTheDocument()
    })

    it('shows empty state before any fetch', () => {
      render(<TagStatisticsReportSection {...defaultProps} />)
      expect(screen.getByText('Henüz veri yok')).toBeInTheDocument()
    })

    it('shows "Yükleniyor..." placeholder when optionsLoading=true', () => {
      render(<TagStatisticsReportSection {...defaultProps} optionsLoading={true} />)
      expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()
    })
  })

  describe('fetching without user filter', () => {
    it('calls getCustomerTagStats with empty params when no user selected', async () => {
      getCustomerTagStats.mockResolvedValue({ data: statsWithTags })
      render(<TagStatisticsReportSection {...defaultProps} />)
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() => expect(getCustomerTagStats).toHaveBeenCalledWith({}))
    })

    it('shows success toast after successful fetch', async () => {
      getCustomerTagStats.mockResolvedValue({ data: statsWithTags })
      render(<TagStatisticsReportSection {...defaultProps} />)
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Rapor getirildi.'))
    })
  })

  describe('fetching with user filter', () => {
    it('calls getCustomerTagStats with assigned_to when user is selected', async () => {
      getCustomerTagStats.mockResolvedValue({ data: statsWithTags })
      const { container } = render(<TagStatisticsReportSection {...defaultProps} />)
      const select = container.querySelector('select')
      await userEvent.selectOptions(select, '1')
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() =>
        expect(getCustomerTagStats).toHaveBeenCalledWith({ assigned_to: '1' })
      )
    })
  })

  describe('results rendering', () => {
    it('renders tag names after successful fetch', async () => {
      getCustomerTagStats.mockResolvedValue({ data: statsWithTags })
      render(<TagStatisticsReportSection {...defaultProps} />)
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() => expect(screen.getByText('Sıcak')).toBeInTheDocument())
      expect(screen.getByText('Soğuk')).toBeInTheDocument()
    })

    it('shows total customer count', async () => {
      getCustomerTagStats.mockResolvedValue({ data: statsWithTags })
      render(<TagStatisticsReportSection {...defaultProps} />)
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() => expect(screen.getByText('30')).toBeInTheDocument())
    })

    it('shows "Toplam Müşteri" label', async () => {
      getCustomerTagStats.mockResolvedValue({ data: statsWithTags })
      render(<TagStatisticsReportSection {...defaultProps} />)
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() => expect(screen.getByText('Toplam Müşteri')).toBeInTheDocument())
    })

    it('shows empty tag state when by_tag array is empty', async () => {
      getCustomerTagStats.mockResolvedValue({ data: { total: 0, by_tag: [] } })
      render(<TagStatisticsReportSection {...defaultProps} />)
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() =>
        expect(screen.getByText('Etiket verisi bulunamadı')).toBeInTheDocument()
      )
    })
  })

  describe('error handling', () => {
    it('shows error toast when API fails', async () => {
      getCustomerTagStats.mockRejectedValue(new Error('Network error'))
      render(<TagStatisticsReportSection {...defaultProps} />)
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Etiket istatistikleri alınamadı.')
      )
    })

    it('stays in loading=false state after error', async () => {
      getCustomerTagStats.mockRejectedValue(new Error('fail'))
      render(<TagStatisticsReportSection {...defaultProps} />)
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() => expect(screen.getByText('Raporu Getir')).toBeInTheDocument())
    })
  })

  describe('reset', () => {
    it('clears results and shows empty state after Temizle', async () => {
      getCustomerTagStats.mockResolvedValue({ data: statsWithTags })
      render(<TagStatisticsReportSection {...defaultProps} />)
      await userEvent.click(screen.getByText('Raporu Getir'))
      await waitFor(() => expect(screen.getByText('Sıcak')).toBeInTheDocument())
      await userEvent.click(screen.getByText('Temizle'))
      expect(screen.getByText('Henüz veri yok')).toBeInTheDocument()
      expect(screen.queryByText('Sıcak')).not.toBeInTheDocument()
    })

    it('resets selected user on Temizle', async () => {
      getCustomerTagStats.mockResolvedValue({ data: statsWithTags })
      const { container } = render(<TagStatisticsReportSection {...defaultProps} />)
      const select = container.querySelector('select')
      await userEvent.selectOptions(select, '1')
      await userEvent.click(screen.getByText('Temizle'))
      expect(select.value).toBe('')
    })
  })
})
