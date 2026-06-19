import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PaymentReportSection from '../../../src/components/reports/PaymentReportSection.jsx'

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
  userOptions: [],
  productOptions: [],
  presetOptions: [{ label: '7 Gün', value: '7' }],
  onSubmit: vi.fn(),
  onReset: vi.fn(),
}

describe('PaymentReportSection', () => {
  it('renders filter panel', () => {
    render(<PaymentReportSection {...defaultProps} />)
    expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
  })

  it('calls onSubmit on click', async () => {
    const onSubmit = vi.fn()
    render(<PaymentReportSection {...defaultProps} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByText('Raporu Getir'))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('calls onReset on Temizle click', async () => {
    const onReset = vi.fn()
    render(<PaymentReportSection {...defaultProps} onReset={onReset} />)
    await userEvent.click(screen.getByText('Temizle'))
    expect(onReset).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    render(<PaymentReportSection {...defaultProps} loading={true} />)
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()
  })

  it('renders with report data', () => {
    const report = {
      summary: { total_paid: 5000, pending_payment: 1000 },
      kpis: [],
      charts: {
        payment_trend: [], status_distribution: [], top_users_by_revenue: [],
        products_revenue: [], detailed_payments: [],
      },
    }
    render(<PaymentReportSection {...defaultProps} report={report} />)
    expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
  })

  describe('empty state', () => {
    it('shows empty state when report is null', () => {
      render(<PaymentReportSection {...defaultProps} report={null} />)
      expect(screen.getByText('Henüz veri yok')).toBeInTheDocument()
    })
  })

  describe('with report data', () => {
    const fullReport = {
      summary: {
        total_sales_appointments: 15,
        total_payment_rows: 30,
        completed_appointments: 10,
        partial_appointments: 3,
        not_started_appointments: 2,
        total_paid_amount: 6000,
        total_remaining_amount: 4000,
      },
      tables: {
        product_breakdown: [
          {
            product_name: 'Diyabet Paketi',
            total_sales_appointments: 15,
            completed_appointments: 10,
            partial_appointments: 3,
            not_started_appointments: 2,
            total_paid_amount: 6000,
            total_remaining_amount: 4000,
          },
        ],
      },
      charts: { revenue_by_product: [], payment_trend: [] },
    }

    it('renders KPI label "Randevulu Satışlar"', () => {
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      // appears in KPI grid and table header column
      expect(screen.getAllByText('Randevulu Satışlar').length).toBeGreaterThan(0)
    })

    it('renders KPI label "Tamamlanan Satışlar"', () => {
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getAllByText('Tamamlanan Satışlar').length).toBeGreaterThan(0)
    })

    it('renders total sales appointments value', () => {
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      // 15 appears in KPI card and table cell
      expect(screen.getAllByText('15').length).toBeGreaterThan(0)
    })

    it('renders product breakdown table row', () => {
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Diyabet Paketi')).toBeInTheDocument()
    })

    it('renders collection rate KPI label', () => {
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Tahsilat Oranı %')).toBeInTheDocument()
    })

    it('computes collection rate as totalPaid / (totalPaid + totalRemaining)', () => {
      // 6000 / 10000 = 60%
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      // KpiGrid calls formatMetric which calls formatPercent → contains %60 or 60%
      const cells = screen.getAllByText((content) => content.includes('60'))
      expect(cells.length).toBeGreaterThan(0)
    })

    it('shows empty revenue chart text when data is empty', () => {
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Gelir verisi bulunamadı.')).toBeInTheDocument()
    })

    it('shows empty payment trend text when data is empty', () => {
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Ödeme trend verisi bulunamadı.')).toBeInTheDocument()
    })

    it('renders the paid-vs-remaining legend cards when amounts exist', () => {
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Tahsil Edilen')).toBeInTheDocument()
      expect(screen.getByText('Kalan')).toBeInTheDocument()
    })

    it('renders footer summary rows', () => {
      render(<PaymentReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Toplam Satış Appointment')).toBeInTheDocument()
      expect(screen.getByText('Toplam Alınan Ödeme Sayısı')).toBeInTheDocument()
      expect(screen.getByText('Toplam Kalan Tutar')).toBeInTheDocument()
    })
  })

  describe('with chart data', () => {
    const reportWithCharts = {
      summary: {
        total_sales_appointments: 5,
        total_payment_rows: 8,
        completed_appointments: 4,
        partial_appointments: 1,
        not_started_appointments: 0,
        total_paid_amount: 3000,
        total_remaining_amount: 1000,
      },
      tables: { product_breakdown: [] },
      charts: {
        revenue_by_product: [
          { product_name: 'Paket A', total_paid_amount: 2000 },
          { product_name: 'Paket B', total_paid_amount: 1000 },
        ],
        payment_trend: [
          { day: '2024-03-01', total_payment_rows: 3, total_paid_amount: 1500 },
          { day: '2024-03-02', total_payment_rows: 5, total_paid_amount: 1500 },
        ],
      },
    }

    it('renders the revenue chart instead of the empty text', () => {
      render(<PaymentReportSection {...defaultProps} report={reportWithCharts} />)
      expect(screen.queryByText('Gelir verisi bulunamadı.')).not.toBeInTheDocument()
    })

    it('renders the payment trend chart with its legend', () => {
      render(<PaymentReportSection {...defaultProps} report={reportWithCharts} />)
      expect(screen.queryByText('Ödeme trend verisi bulunamadı.')).not.toBeInTheDocument()
      expect(screen.getByText('Gelir')).toBeInTheDocument()
    })

    it('shows the product breakdown empty text when table is empty', () => {
      render(<PaymentReportSection {...defaultProps} report={reportWithCharts} />)
      expect(screen.getByText('Ödeme ürün kırılımı bulunamadı.')).toBeInTheDocument()
    })
  })

  describe('collection rate edge cases', () => {
    it('is 0 and pie shows empty text when there are no amounts', () => {
      const zeroReport = {
        summary: {
          total_sales_appointments: 0,
          total_payment_rows: 0,
          completed_appointments: 0,
          partial_appointments: 0,
          not_started_appointments: 0,
          total_paid_amount: 0,
          total_remaining_amount: 0,
        },
        tables: { product_breakdown: [] },
        charts: { revenue_by_product: [], payment_trend: [] },
      }
      render(<PaymentReportSection {...defaultProps} report={zeroReport} />)
      expect(screen.getByText('Tahsilat dağılımı verisi bulunamadı.')).toBeInTheDocument()
    })
  })
})
