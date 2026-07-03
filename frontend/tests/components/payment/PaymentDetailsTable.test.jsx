import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PaymentDetailsTable from '../../../src/components/payment/PaymentDetailsTable.jsx'

vi.mock('../../../src/services/events.js', () => ({
  deleteAppointmentPayment: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { deleteAppointmentPayment } from '../../../src/services/events.js'
import toast from 'react-hot-toast'

const payments = [
  { id: 1, payment_date: '2024-03-15', paid_amount: 500, remaining_amount: 200, payment_status: 'kismi' },
  { id: 2, payment_date: '2024-04-01', paid_amount: 1000, remaining_amount: 0, payment_status: 'tamamlandi' },
]

beforeEach(() => {
  vi.clearAllMocks()
  deleteAppointmentPayment.mockResolvedValue({})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PaymentDetailsTable', () => {
  it('renders a row per payment with formatted amounts', () => {
    render(<PaymentDetailsTable payments={payments} />)
    expect(screen.getByText('500 ₺')).toBeInTheDocument()
    expect(screen.getByText('200 ₺')).toBeInTheDocument()
    expect(screen.getByText('1.000 ₺')).toBeInTheDocument()
  })

  it('renders table headers', () => {
    render(<PaymentDetailsTable payments={payments} />)
    expect(screen.getByText('Tarih')).toBeInTheDocument()
    expect(screen.getByText('Ödenen')).toBeInTheDocument()
    expect(screen.getByText('Kalan')).toBeInTheDocument()
    expect(screen.getByText('Durum')).toBeInTheDocument()
  })

  describe('status badges', () => {
    it('shows "Tamamlandı" for tamamlandi', () => {
      render(<PaymentDetailsTable payments={[payments[1]]} />)
      expect(screen.getByText('Tamamlandı')).toBeInTheDocument()
    })

    it('shows "Kısmi" for kismi with paid amount > 0', () => {
      render(<PaymentDetailsTable payments={[payments[0]]} />)
      expect(screen.getByText('Kısmi')).toBeInTheDocument()
    })

    it('shows "Ödemeye başlanmadı" for kismi with paid amount = 0', () => {
      const notStarted = [{ ...payments[0], paid_amount: 0 }]
      render(<PaymentDetailsTable payments={notStarted} />)
      expect(screen.getByText('Ödemeye başlanmadı')).toBeInTheDocument()
    })

    it('shows "İptal" for iptal', () => {
      const cancelled = [{ ...payments[0], payment_status: 'iptal' }]
      render(<PaymentDetailsTable payments={cancelled} />)
      expect(screen.getByText('İptal')).toBeInTheDocument()
    })

    it('falls back to raw status for unknown values', () => {
      const unknown = [{ ...payments[0], payment_status: 'beklemede' }]
      render(<PaymentDetailsTable payments={unknown} />)
      expect(screen.getByText('beklemede')).toBeInTheDocument()
    })
  })

  describe('delete flow', () => {
    it('deletes payment, shows success toast and refreshes on confirm', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const onRefresh = vi.fn()
      render(<PaymentDetailsTable payments={[payments[0]]} onRefresh={onRefresh} />)

      await userEvent.click(screen.getByTitle('Ödemeyi sil'))

      await waitFor(() => {
        expect(deleteAppointmentPayment).toHaveBeenCalledWith(1)
      })
      expect(toast.success).toHaveBeenCalledWith('Ödeme silindi.')
      await waitFor(() => expect(onRefresh).toHaveBeenCalled())
    })

    it('does not delete when confirm is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      render(<PaymentDetailsTable payments={[payments[0]]} onRefresh={vi.fn()} />)

      await userEvent.click(screen.getByTitle('Ödemeyi sil'))

      expect(deleteAppointmentPayment).not.toHaveBeenCalled()
    })

    it('shows error toast when delete fails', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      deleteAppointmentPayment.mockRejectedValue(new Error('fail'))
      render(<PaymentDetailsTable payments={[payments[0]]} onRefresh={vi.fn()} />)

      await userEvent.click(screen.getByTitle('Ödemeyi sil'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Ödeme silinemedi.')
      })
    })
  })
})
