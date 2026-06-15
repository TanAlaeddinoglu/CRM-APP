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
})
