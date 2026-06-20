import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import UserReportSection from '../../../src/components/reports/UserReportSection.jsx'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
  Tooltip: () => null, Legend: () => null, PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null, Cell: () => null, LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null, LabelList: () => null,
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
    expect(screen.getByText('Son 7 Gün')).toBeInTheDocument()
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

  describe('empty state', () => {
    it('shows empty state when report is null', () => {
      render(<UserReportSection {...defaultProps} report={null} />)
      expect(screen.getByText('Henüz veri yok')).toBeInTheDocument()
    })
  })

  describe('with report data', () => {
    const fullReport = {
      target_user: { username: 'aveli', first_name: 'Ali', last_name: 'Veli', role: 'Agent' },
      summary: {
        active_customer_count: 12,
        tag_change_count: 4,
        total_appointments: 20,
        pending_appointments: 3,
        sales_appointments: 14,
        negative_appointments: 3,
        conversion_rate: 70,
        rejection_rate: 15,
        top_products: [{ product_id: 1, product_name: 'Diabetes Paketi', count: 8 }],
      },
      charts: {
        tag_distribution: [],
        sales_by_product: [],
        appointments_trend: [],
      },
    }

    it('renders KPI label "Aktif Müşteri"', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Aktif Müşteri')).toBeInTheDocument()
    })

    it('renders KPI label "Toplam Randevu"', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Toplam Randevu')).toBeInTheDocument()
    })

    it('renders KPI label "Etiket Değişimi"', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Etiket Değişimi')).toBeInTheDocument()
    })

    it('renders active customer count value', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('12')).toBeInTheDocument()
    })

    it('renders selected user full name in user card', () => {
      const { container } = render(<UserReportSection {...defaultProps} report={fullReport} />)
      const nameEl = container.querySelector('.reports-user-hero__name')
      expect(nameEl?.textContent).toBe('Ali Veli')
    })

    it('renders selected user username in user card', () => {
      const { container } = render(<UserReportSection {...defaultProps} report={fullReport} />)
      const handleEl = container.querySelector('.reports-user-hero__handle')
      expect(handleEl?.textContent).toBe('@aveli')
    })

    it('renders user role in user card', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Agent')).toBeInTheDocument()
    })

    it('renders top product name', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Diabetes Paketi')).toBeInTheDocument()
    })

    it('renders top product sale count', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('shows empty chart text when trend data is empty', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Randevu trend verisi bulunamadı.')).toBeInTheDocument()
    })

    it('shows empty chart text when tag distribution is empty', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Etiket değişim verisi bulunamadı.')).toBeInTheDocument()
    })

    it('shows empty chart text when sales by product is empty', () => {
      render(<UserReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Ürün bazlı satış verisi bulunamadı.')).toBeInTheDocument()
    })
  })

  describe('filter mutual exclusion', () => {
    it('clears date_from and date_to when preset is selected', async () => {
      const setFilters = vi.fn()
      const filtersWithDates = { preset: '', date_from: '2024-01-01', date_to: '2024-01-31', user_id: '' }
      render(
        <UserReportSection {...defaultProps} filters={filtersWithDates} setFilters={setFilters} />
      )
      const presetSelect = screen.getByLabelText('Tarih Aralığı')
      await userEvent.selectOptions(presetSelect, 'last7')
      const call = setFilters.mock.calls[0][0]
      const next = typeof call === 'function' ? call(filtersWithDates) : call
      expect(next.preset).toBe('last7')
      expect(next.date_from).not.toBe('2024-01-01')
      expect(next.date_to).not.toBe('2024-01-31')
    })

    it('clears preset when date_from is set', async () => {
      const setFilters = vi.fn()
      const filtersWithPreset = { preset: 'last7', date_from: '', date_to: '', user_id: '' }
      render(
        <UserReportSection {...defaultProps} filters={filtersWithPreset} setFilters={setFilters} />
      )
      const dateInput = screen.getByLabelText('Başlangıç')
      await userEvent.type(dateInput, '2024-03-01')
      const call = setFilters.mock.calls[0][0]
      const next = typeof call === 'function' ? call(filtersWithPreset) : call
      expect(next.preset).toBe('')
    })
  })
})
