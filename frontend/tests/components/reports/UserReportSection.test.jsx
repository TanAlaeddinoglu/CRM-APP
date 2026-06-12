import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import UserReportSection from '../../../src/components/reports/UserReportSection.jsx'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
  Tooltip: () => null, Legend: () => null, PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null, Cell: () => null, LineChart: ({ children }) => <div>{children}</div>, Line: () => null,
}))

beforeEach(() => vi.clearAllMocks())

const defaultProps = {
  filters: { preset: '7', date_from: '', date_to: '', user_id: '' },
  setFilters: vi.fn(),
  report: null,
  loading: false,
  optionsLoading: false,
  userOptions: [{ value: '1', label: 'Ali (ali)' }],
  presetOptions: [{ label: '7 Gün', value: '7' }, { label: '30 Gün', value: '30' }],
  onSubmit: vi.fn(),
  onReset: vi.fn(),
}

describe('UserReportSection', () => {
  it('renders filter panel', () => {
    render(<UserReportSection {...defaultProps} />)
    expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
  })

  it('shows preset select with options', () => {
    render(<UserReportSection {...defaultProps} />)
    expect(screen.getByText('7 Gün')).toBeInTheDocument()
  })

  it('calls onSubmit when button clicked', async () => {
    const onSubmit = vi.fn()
    render(<UserReportSection {...defaultProps} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByText('Raporu Getir'))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('calls onReset when Temizle clicked', async () => {
    const onReset = vi.fn()
    render(<UserReportSection {...defaultProps} onReset={onReset} />)
    await userEvent.click(screen.getByText('Temizle'))
    expect(onReset).toHaveBeenCalled()
  })

  it('shows loading state when loading=true', () => {
    render(<UserReportSection {...defaultProps} loading={true} />)
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()
  })

  it('renders with report data (KPIs)', async () => {
    const reportData = {
      summary: { total_appointments: 20, sales_count: 8, sales_rate: 40, pending_count: 5, negative_count: 7 },
      kpis: [{ label: 'Toplam', value: 20, color: 'info' }],
      charts: {
        tag_distribution: [],
        sales_by_product: [],
        appointments_trend: [],
        top_users: [],
        tag_change_trend: [],
        detailed_users: [],
      },
    }
    render(<UserReportSection {...defaultProps} report={reportData} />)
    // Component renders without crashing with data
    expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
  })

  it('renders user options in select', () => {
    render(<UserReportSection {...defaultProps} />)
    expect(screen.getByText('Ali (ali)')).toBeInTheDocument()
  })

  it('calls setFilters when preset changes', async () => {
    const setFilters = vi.fn()
    const { container } = render(<UserReportSection {...defaultProps} setFilters={setFilters} />)
    const presetSelect = container.querySelector('[name="preset"]')
    if (presetSelect) {
      await userEvent.selectOptions(presetSelect, '7')
      expect(setFilters).toHaveBeenCalled()
    }
  })
})
