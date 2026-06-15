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

  it('shows loading state', () => {
    render(<ProductPriceDistributionReportSection {...defaultProps} loading={true} />)
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()
  })
})
