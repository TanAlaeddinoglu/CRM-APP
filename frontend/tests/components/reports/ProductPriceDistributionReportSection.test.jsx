import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProductPriceDistributionReportSection from '../../../src/components/reports/ProductPriceDistributionReportSection.jsx'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
  Tooltip: () => null, Legend: () => null,
}))

beforeEach(() => vi.clearAllMocks())

const defaultProps = {
  filters: { preset: '7', date_from: '', date_to: '', user_id: '', product_id: '' },
  setFilters: vi.fn(),
  report: null,
  loading: false,
  optionsLoading: false,
  userOptions: [],
  productOptions: [{ value: '1', label: 'Diabetes' }],
  presetOptions: [{ label: '7 Gün', value: '7' }],
  onSubmit: vi.fn(),
  onReset: vi.fn(),
}

describe('ProductPriceDistributionReportSection', () => {
  it('renders filter panel', () => {
    render(<ProductPriceDistributionReportSection {...defaultProps} />)
    expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
  })

  it('calls onSubmit', async () => {
    const onSubmit = vi.fn()
    render(<ProductPriceDistributionReportSection {...defaultProps} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByText('Raporu Getir'))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('calls onReset', async () => {
    const onReset = vi.fn()
    render(<ProductPriceDistributionReportSection {...defaultProps} onReset={onReset} />)
    await userEvent.click(screen.getByText('Temizle'))
    expect(onReset).toHaveBeenCalled()
  })

  it('renders with report data', () => {
    const report = {
      summary: { total_records: 5 },
      tables: { price_distribution: [{ product: 'Diabetes', min_price: 100, max_price: 500, avg_price: 300, total_patients: 10 }] },
    }
    render(<ProductPriceDistributionReportSection {...defaultProps} report={report} />)
    expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
  })

  it('shows loading state (Yükleniyor... on submit button)', () => {
    render(<ProductPriceDistributionReportSection {...defaultProps} loading={true} />)
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()
  })

  describe('loading panel', () => {
    it('shows "Rapor hazırlanıyor" when loading=true and no report', () => {
      render(<ProductPriceDistributionReportSection {...defaultProps} loading={true} report={null} />)
      expect(screen.getByText('Rapor hazırlanıyor')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows "Henüz veri yok" when no report and not loading', () => {
      render(<ProductPriceDistributionReportSection {...defaultProps} report={null} loading={false} />)
      expect(screen.getByText('Henüz veri yok')).toBeInTheDocument()
    })
  })

  describe('with report data', () => {
    const fullReport = {
      summary: {
        total_sales_count: 20,
        total_not_started_sales_count: 3,
        total_expected_amount: 50000,
        total_collected_amount: 35000,
        total_remaining_amount: 15000,
        overall_collection_rate: 70,
      },
      tables: {
        price_distribution: [
          {
            product_name: 'Diyabet Paketi',
            sale_price: 2500,
            sale_count: 20,
            not_started_count: 3,
            expected_total: 50000,
            collected_total: 35000,
            remaining_total: 15000,
            collection_rate: 70,
          },
        ],
      },
    }

    it('renders summary card "Toplam Satış Adedi"', () => {
      render(<ProductPriceDistributionReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Toplam Satış Adedi')).toBeInTheDocument()
    })

    it('renders summary card "Genel Tahsilat Oranı"', () => {
      render(<ProductPriceDistributionReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Tahsilat Oranı %')).toBeInTheDocument()
    })

    it('renders total sales count value', () => {
      render(<ProductPriceDistributionReportSection {...defaultProps} report={fullReport} />)
      // 20 appears in both summary card and table cell
      expect(screen.getAllByText('20').length).toBeGreaterThan(0)
    })

    it('renders price distribution table row with product name', () => {
      render(<ProductPriceDistributionReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Diyabet Paketi')).toBeInTheDocument()
    })

    it('renders "Ürün Fiyat Dağılımı" table panel title', () => {
      render(<ProductPriceDistributionReportSection {...defaultProps} report={fullReport} />)
      expect(screen.getByText('Ürün Fiyat Dağılımı')).toBeInTheDocument()
    })

    it('does not show empty state when report is provided', () => {
      render(<ProductPriceDistributionReportSection {...defaultProps} report={fullReport} />)
      expect(screen.queryByText('Henüz veri yok')).not.toBeInTheDocument()
    })
  })
})
