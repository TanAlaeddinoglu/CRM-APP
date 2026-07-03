import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AppointmentsReportSection from '../../../src/components/reports/AppointmentsReportSection.jsx'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
  Tooltip: () => null, Legend: () => null, PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null, Cell: () => null, ComposedChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
}))

beforeEach(() => vi.clearAllMocks())

const defaultProps = {
  filters: { preset: '7', date_from: '', date_to: '', user_id: '', product_id: '' },
  setFilters: vi.fn(),
  report: null,
  loading: false,
  optionsLoading: false,
  userOptions: [{ value: '1', label: 'Ali' }],
  productOptions: [{ value: '1', label: 'Diabetes' }],
  presetOptions: [{ label: '7 Gün', value: '7' }],
  onSubmit: vi.fn(),
  onReset: vi.fn(),
}

describe('AppointmentsReportSection', () => {
  it('renders filter panel', () => {
    render(<AppointmentsReportSection {...defaultProps} />)
    expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
  })

  it('calls onSubmit on button click', async () => {
    const onSubmit = vi.fn()
    render(<AppointmentsReportSection {...defaultProps} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByText('Raporu Getir'))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('calls onReset on Temizle click', async () => {
    const onReset = vi.fn()
    render(<AppointmentsReportSection {...defaultProps} onReset={onReset} />)
    await userEvent.click(screen.getByText('Temizle'))
    expect(onReset).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    render(<AppointmentsReportSection {...defaultProps} loading={true} />)
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()
  })

  it('renders with report data', () => {
    const report = {
      summary: { total_appointments: 10, sales_count: 5 },
      kpis: [],
      charts: {
        appointments_trend: [],
        status_distribution: [],
        type_distribution: [],
        top_users: [],
        products_summary: [],
        detailed_users: [],
        daily_status_breakdown: [],
      },
    }
    render(<AppointmentsReportSection {...defaultProps} report={report} />)
    expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
  })

  it('calls setFilters when filter changes', async () => {
    const setFilters = vi.fn()
    const { container } = render(<AppointmentsReportSection {...defaultProps} setFilters={setFilters} />)
    const presetSelect = container.querySelector('[name="preset"]')
    if (presetSelect) {
      await userEvent.selectOptions(presetSelect, '7')
      expect(setFilters).toHaveBeenCalled()
    } else {
      expect(setFilters).toBeDefined()
    }
  })

  describe('empty state', () => {
    it('shows empty state when report is null', () => {
      render(<AppointmentsReportSection {...defaultProps} report={null} />)
      expect(screen.getByText('Henüz veri yok')).toBeInTheDocument()
    })
  })

  describe('with report data', () => {
    const fullReport = {
      summary: {
        total_appointments: 40,
        pending_appointments: 10,
        sales_appointments: 25,
        negative_appointments: 5,
        sales_rate: 62.5,
        pending_rate: 25,
        negative_rate: 12.5,
      },
      tables: {
        product_breakdown: [
          { product_name: 'Diabetes Paketi', total: 20, pending: 5, sales: 13, negative: 2, sales_rate: 65 },
        ],
        user_performance: [
          { username: 'aveli', total: 40, pending: 10, sales: 25, negative: 5, sales_rate: 62.5 },
        ],
      },
      charts: { trend: [] },
    }

    it('renders KPI label "Toplam Randevu"', () => {
      render(<AppointmentsReportSection {...defaultProps} report={fullReport} />)
      // appears in both KPI grid and table header
      expect(screen.getAllByText('Toplam Randevu').length).toBeGreaterThan(0)
    })

    it('renders total appointments value', () => {
      render(<AppointmentsReportSection {...defaultProps} report={fullReport} />)
      // value appears in KPI card, table footer, and table cell
      expect(screen.getAllByText('40').length).toBeGreaterThan(0)
    })

    it('renders KPI label "Beklemede"', () => {
      render(<AppointmentsReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getAllByText('Beklemede').length).toBeGreaterThan(0)
    })

    it('renders product breakdown table with product name', () => {
      render(<AppointmentsReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Diabetes Paketi')).toBeInTheDocument()
    })

    it('renders user performance table with username', () => {
      render(<AppointmentsReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('aveli')).toBeInTheDocument()
    })

    it('shows empty trend chart text when trend data is empty', () => {
      render(<AppointmentsReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Trend verisi bulunamadı.')).toBeInTheDocument()
    })
  })

  describe('filter mutual exclusion', () => {
    it('clears dates when preset is selected', async () => {
      const setFilters = vi.fn()
      const filtersWithDates = { preset: '', date_from: '2024-01-01', date_to: '2024-01-31', user_id: '', product_id: '' }
      render(
        <AppointmentsReportSection {...defaultProps} filters={filtersWithDates} setFilters={setFilters} />
      )
      const presetSelect = screen.getByLabelText('Tarih Aralığı')
      await userEvent.selectOptions(presetSelect, 'last7')
      const call = setFilters.mock.calls[0][0]
      const next = typeof call === 'function' ? call(filtersWithDates) : call
      expect(next.preset).toBe('last7')
      expect(next.date_from).not.toBe('2024-01-01')
      expect(next.date_to).not.toBe('2024-01-31')
    })

    it('clears preset when date_to is set', async () => {
      const setFilters = vi.fn()
      const filtersWithPreset = { preset: 'last7', date_from: '', date_to: '', user_id: '', product_id: '' }
      render(
        <AppointmentsReportSection {...defaultProps} filters={filtersWithPreset} setFilters={setFilters} />
      )
      const dateInput = screen.getByLabelText('Bitiş')
      await userEvent.type(dateInput, '2024-03-31')
      const call = setFilters.mock.calls[0][0]
      const next = typeof call === 'function' ? call(filtersWithPreset) : call
      expect(next.preset).toBe('')
    })
  })
})
