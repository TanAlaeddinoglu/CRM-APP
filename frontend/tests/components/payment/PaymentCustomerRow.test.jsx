import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PaymentCustomerRow from '../../../src/components/payment/PaymentCustomerRow.jsx'

vi.mock('../../../src/components/payment/AddPaymentModal.jsx', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="add-payment-modal" /> : null),
}))

vi.mock('../../../src/components/payment/PaymentDetailsTable.jsx', () => ({
  default: ({ payments }) => (
    <div data-testid="details-table">{payments.length} ödeme</div>
  ),
}))

const appointment = { id: 7, customer: 'Ali Veli', name: 'Konsültasyon' }

const payments = [
  { id: 1, created_at: '2024-03-01T10:00:00Z', total_amount: 1500, paid_amount: 500, remaining_amount: 1000, payment_status: 'kismi' },
  { id: 2, created_at: '2024-03-10T10:00:00Z', total_amount: 1500, paid_amount: 400, remaining_amount: 600, payment_status: 'kismi' },
]

beforeEach(() => vi.clearAllMocks())

describe('PaymentCustomerRow', () => {
  it('renders customer name and appointment name', () => {
    render(<PaymentCustomerRow appointment={appointment} payments={payments} />)
    expect(screen.getByText('Ali Veli')).toBeInTheDocument()
    expect(screen.getByText('Konsültasyon')).toBeInTheDocument()
  })

  it('shows "Bilinmeyen müşteri" when appointment is null', () => {
    render(<PaymentCustomerRow appointment={null} payments={payments} />)
    expect(screen.getByText('Bilinmeyen müşteri')).toBeInTheDocument()
  })

  it('computes total from latest payment and sums paid amounts', () => {
    // latest by created_at = id:2 (total 1500, remaining 600); paid = 500 + 400 = 900
    render(<PaymentCustomerRow appointment={appointment} payments={payments} />)
    expect(screen.getByText('Toplam: 1.500 ₺')).toBeInTheDocument()
    expect(screen.getByText('Ödenen: 900 ₺')).toBeInTheDocument()
    expect(screen.getByText('Kalan: 600 ₺')).toBeInTheDocument()
  })

  it('shows zero values when there are no payments', () => {
    render(<PaymentCustomerRow appointment={appointment} payments={[]} />)
    expect(screen.getByText('Toplam: 0 ₺')).toBeInTheDocument()
    expect(screen.getByText('Ödenen: 0 ₺')).toBeInTheDocument()
  })

  describe('summary status class', () => {
    const statusClass = (container) =>
      container.querySelector('.summary').className

    it('applies completed class and shows check icon when latest is tamamlandi', () => {
      const completed = [{ ...payments[1], payment_status: 'tamamlandi', remaining_amount: 0 }]
      const { container } = render(<PaymentCustomerRow appointment={appointment} payments={completed} />)
      expect(statusClass(container)).toContain('payment-summary-completed')
      expect(container.querySelector('.payment-complete-icon')).toBeInTheDocument()
    })

    it('applies not-started class for kismi with zero paid', () => {
      const notStarted = [{ ...payments[0], paid_amount: 0, payment_status: 'kismi' }]
      const { container } = render(<PaymentCustomerRow appointment={appointment} payments={notStarted} />)
      expect(statusClass(container)).toContain('payment-summary-not-started')
    })

    it('applies partial class for kismi with paid > 0', () => {
      const { container } = render(<PaymentCustomerRow appointment={appointment} payments={payments} />)
      expect(statusClass(container)).toContain('payment-summary-partial')
    })

    it('applies cancelled class for iptal', () => {
      const cancelled = [{ ...payments[1], payment_status: 'iptal' }]
      const { container } = render(<PaymentCustomerRow appointment={appointment} payments={cancelled} />)
      expect(statusClass(container)).toContain('payment-summary-cancelled')
    })
  })

  describe('expand', () => {
    it('shows details table only after expanding', async () => {
      render(<PaymentCustomerRow appointment={appointment} payments={payments} />)
      expect(screen.queryByTestId('details-table')).not.toBeInTheDocument()
      await userEvent.click(screen.getByText('▶'))
      expect(screen.getByTestId('details-table')).toBeInTheDocument()
    })
  })

  describe('add payment button', () => {
    it('is disabled when remaining is 0', () => {
      const completed = [{ ...payments[1], remaining_amount: 0, payment_status: 'tamamlandi' }]
      render(<PaymentCustomerRow appointment={appointment} payments={completed} />)
      expect(screen.getByTitle('Ödeme ekle')).toBeDisabled()
    })

    it('opens AddPaymentModal when clicked', async () => {
      render(<PaymentCustomerRow appointment={appointment} payments={payments} />)
      expect(screen.queryByTestId('add-payment-modal')).not.toBeInTheDocument()
      await userEvent.click(screen.getByTitle('Ödeme ekle'))
      expect(screen.getByTestId('add-payment-modal')).toBeInTheDocument()
    })
  })
})
