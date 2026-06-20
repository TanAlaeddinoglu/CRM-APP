import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PaymentItem from '../../../../src/components/customer/payments/PaymentItem.jsx'

vi.mock('../../../../src/components/payment/AddPaymentModal.jsx', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="add-payment-modal" /> : null),
}))

const basePayment = {
  id: 10,
  appointment: 42,
  payment_date: '2024-03-15',
  payment_status: 'kismi',
  paid_amount: 500,
  total_amount: 1500,
  remaining_amount: 1000,
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('PaymentItem', () => {
  it('renders formatted amounts with currency', () => {
    render(<PaymentItem payment={basePayment} onDelete={vi.fn()} />)
    expect(screen.getByText('500 ₺')).toBeInTheDocument()
    expect(screen.getByText('1.500 ₺')).toBeInTheDocument()
    expect(screen.getByText('1.000 ₺')).toBeInTheDocument()
  })

  describe('status label mapping', () => {
    it.each([
      ['kismi', 'Kısmi'],
      ['tamamlandi', 'Tamamlandı'],
      ['iptal', 'İptal'],
    ])('maps %s to %s', (status, label) => {
      render(<PaymentItem payment={{ ...basePayment, payment_status: status }} onDelete={vi.fn()} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })

    it('falls back to raw status for unknown values', () => {
      render(<PaymentItem payment={{ ...basePayment, payment_status: 'foo' }} onDelete={vi.fn()} />)
      expect(screen.getByText('foo')).toBeInTheDocument()
    })
  })

  describe('appointment name', () => {
    it('uses appointment.name when provided', () => {
      render(<PaymentItem payment={basePayment} appointment={{ name: 'Konsültasyon' }} onDelete={vi.fn()} />)
      expect(screen.getByText('Konsültasyon')).toBeInTheDocument()
    })

    it('falls back to "Randevu #<id>" when appointment is missing', () => {
      render(<PaymentItem payment={basePayment} onDelete={vi.fn()} />)
      expect(screen.getByText('Randevu #42')).toBeInTheDocument()
    })
  })

  describe('date formatting', () => {
    it('formats a valid date', () => {
      render(<PaymentItem payment={basePayment} onDelete={vi.fn()} />)
      expect(screen.getByText('15.03.2024')).toBeInTheDocument()
    })

    it('shows dash for null date', () => {
      render(<PaymentItem payment={{ ...basePayment, payment_date: null }} onDelete={vi.fn()} />)
      expect(screen.getByText('-')).toBeInTheDocument()
    })
  })

  it('hides "Kalan" row when remaining_amount is undefined', () => {
    const { remaining_amount, ...withoutRemaining } = basePayment
    render(<PaymentItem payment={withoutRemaining} onDelete={vi.fn()} />)
    expect(screen.queryByText('Kalan:')).not.toBeInTheDocument()
  })

  it('shows "Ekleyen" row when created_by is present', () => {
    render(<PaymentItem payment={{ ...basePayment, created_by: 'admin' }} onDelete={vi.fn()} />)
    expect(screen.getByText('Ekleyen:')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('hides "Ekleyen" row when created_by is absent', () => {
    render(<PaymentItem payment={basePayment} onDelete={vi.fn()} />)
    expect(screen.queryByText('Ekleyen:')).not.toBeInTheDocument()
  })

  describe('delete', () => {
    it('calls onDelete(payment.id) on confirm', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const onDelete = vi.fn()
      render(<PaymentItem payment={basePayment} onDelete={onDelete} />)
      await userEvent.click(screen.getByTitle('Ödemeyi sil'))
      expect(onDelete).toHaveBeenCalledWith(10)
    })

    it('does not call onDelete when confirm is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const onDelete = vi.fn()
      render(<PaymentItem payment={basePayment} onDelete={onDelete} />)
      await userEvent.click(screen.getByTitle('Ödemeyi sil'))
      expect(onDelete).not.toHaveBeenCalled()
    })
  })

  it('opens AddPaymentModal when add button clicked', async () => {
    render(<PaymentItem payment={basePayment} onDelete={vi.fn()} />)
    expect(screen.queryByTestId('add-payment-modal')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTitle('Bu randevu için ödeme ekle'))
    expect(screen.getByTestId('add-payment-modal')).toBeInTheDocument()
  })
})
