import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ReportsPage from '../../src/pages/reports/ReportsPage.jsx'

vi.mock('../../src/context/PageTransitionContext.jsx', () => ({
  usePageTransition: () => {},
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../src/services/user.js', () => ({
  getUsers: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
}))

vi.mock('../../src/services/product.js', () => ({
  getProducts: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
}))

vi.mock('../../src/services/report.js', () => ({
  getUserDashboardSummary: vi.fn(),
  getAppointmentsSummary: vi.fn(),
  getPaymentSummary: vi.fn(),
  getProductPriceDistributionSummary: vi.fn(),
}))

vi.mock('../../src/services/customer.js', () => ({
  getCustomerTagStats: vi.fn(),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  ComposedChart: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  Line: () => null,
  Pie: () => null,
  Cell: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  LabelList: () => null,
}))

import { getUsers } from '../../src/services/user.js'
import { getProducts } from '../../src/services/product.js'

beforeEach(() => vi.clearAllMocks())

describe('ReportsPage', () => {
  describe('layout', () => {
    it('renders the page title "Raporlar"', async () => {
      render(<ReportsPage />)
      expect(screen.getByText('Raporlar')).toBeInTheDocument()
    })

    it('renders all 5 tab buttons', () => {
      render(<ReportsPage />)
      expect(screen.getByText('Kullanıcı Raporu')).toBeInTheDocument()
      expect(screen.getByText('Randevu Raporu')).toBeInTheDocument()
      expect(screen.getByText('Ödeme Raporu')).toBeInTheDocument()
      expect(screen.getByText('Ürün Fiyat Dağılımı')).toBeInTheDocument()
      expect(screen.getByText('Etiket İstatistikleri')).toBeInTheDocument()
    })
  })

  describe('default tab', () => {
    it('shows user report section by default', async () => {
      render(<ReportsPage />)
      // optionsLoading starts true; wait for promises to resolve before checking placeholder
      await waitFor(() => expect(screen.getByText('User seç')).toBeInTheDocument())
    })

    it('marks Kullanıcı Raporu tab as active by default', () => {
      const { container } = render(<ReportsPage />)
      const activeTab = container.querySelector('.reports-tab--active')
      expect(activeTab?.textContent).toContain('Kullanıcı Raporu')
    })
  })

  describe('tab switching', () => {
    it('switches to appointments section', async () => {
      render(<ReportsPage />)
      await userEvent.click(screen.getByText('Randevu Raporu'))
      await waitFor(() =>
        expect(screen.queryByText('User seç')).not.toBeInTheDocument()
      )
      expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
    })

    it('switches to payment section', async () => {
      render(<ReportsPage />)
      await userEvent.click(screen.getByText('Ödeme Raporu'))
      expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
    })

    it('switches to price distribution section', async () => {
      render(<ReportsPage />)
      await userEvent.click(screen.getByText('Ürün Fiyat Dağılımı'))
      expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
    })

    it('switches to tag statistics section', async () => {
      render(<ReportsPage />)
      await userEvent.click(screen.getByText('Etiket İstatistikleri'))
      expect(screen.getByText('Raporu Getir')).toBeInTheDocument()
    })

    it('can switch back to user tab after switching away', async () => {
      render(<ReportsPage />)
      await userEvent.click(screen.getByText('Randevu Raporu'))
      await userEvent.click(screen.getByText('Kullanıcı Raporu'))
      expect(screen.getByText('User seç')).toBeInTheDocument()
    })
  })

  describe('data fetching on mount', () => {
    it('calls getUsers on mount', async () => {
      render(<ReportsPage />)
      await waitFor(() => expect(getUsers).toHaveBeenCalledTimes(1))
    })

    it('calls getProducts on mount', async () => {
      render(<ReportsPage />)
      await waitFor(() => expect(getProducts).toHaveBeenCalledTimes(1))
    })

    it('populates user options from API response', async () => {
      getUsers.mockResolvedValue({
        data: {
          results: [{ id: 1, first_name: 'Ali', last_name: 'Veli', username: 'aveli' }],
          count: 1,
        },
      })
      render(<ReportsPage />)
      await waitFor(() =>
        expect(screen.getByText('Ali Veli (aveli)')).toBeInTheDocument()
      )
    })
  })

  describe('preset options', () => {
    it('renders preset options in user report filter', () => {
      render(<ReportsPage />)
      expect(screen.getByText('7 Gün')).toBeInTheDocument()
      expect(screen.getByText('30 Gün')).toBeInTheDocument()
    })
  })
})
