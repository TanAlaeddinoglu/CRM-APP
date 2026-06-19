import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CustomerPaymentsSection from '../../../../src/components/customer/payments/CustomerPaymentsSection.jsx'

vi.mock('../../../../src/services/events.js', () => ({
  getAppointmentPaymentsByCustomer: vi.fn(),
  getAppointmentById: vi.fn(),
  deleteAppointmentPayment: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Keep PaymentCustomerRow real for integration, but stub its heavy modal child.
vi.mock('../../../../src/components/payment/AddPaymentModal.jsx', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="add-payment-modal" /> : null),
}))

import {
  getAppointmentPaymentsByCustomer,
  getAppointmentById,
} from '../../../../src/services/events.js'
import { toast } from 'react-hot-toast'

const payments = [
  { id: 1, appointment: 7, created_at: '2024-03-01T10:00:00Z', total_amount: 1500, paid_amount: 500, remaining_amount: 1000, payment_status: 'kismi' },
  { id: 2, appointment: 8, created_at: '2024-03-05T10:00:00Z', total_amount: 2000, paid_amount: 2000, remaining_amount: 0, payment_status: 'tamamlandi' },
]

beforeEach(() => {
  vi.clearAllMocks()
  getAppointmentPaymentsByCustomer.mockResolvedValue({ data: { results: payments } })
  getAppointmentById.mockImplementation((id) =>
    Promise.resolve({ data: { id, customer: `Müşteri ${id}`, name: `Randevu ${id}` } })
  )
})

describe('CustomerPaymentsSection', () => {
  it('does not fetch when customerId is missing', () => {
    render(<CustomerPaymentsSection customerId={undefined} />)
    expect(getAppointmentPaymentsByCustomer).not.toHaveBeenCalled()
  })

  it('fetches payments and appointment details for the customer', async () => {
    render(<CustomerPaymentsSection customerId={3} />)
    await waitFor(() => {
      expect(getAppointmentPaymentsByCustomer).toHaveBeenCalledWith(3)
    })
    await waitFor(() => {
      expect(getAppointmentById).toHaveBeenCalledWith(7)
      expect(getAppointmentById).toHaveBeenCalledWith(8)
    })
  })

  it('renders one PaymentCustomerRow per appointment group', async () => {
    render(<CustomerPaymentsSection customerId={3} />)
    expect(await screen.findByText('Müşteri 7')).toBeInTheDocument()
    expect(screen.getByText('Müşteri 8')).toBeInTheDocument()
  })

  it('shows the empty state when the customer has no payments', async () => {
    getAppointmentPaymentsByCustomer.mockResolvedValue({ data: { results: [] } })
    render(<CustomerPaymentsSection customerId={3} />)
    expect(await screen.findByText('Bu müşteri için henüz ödeme yok.')).toBeInTheDocument()
  })

  it('shows an error toast when the fetch fails', async () => {
    getAppointmentPaymentsByCustomer.mockRejectedValue(new Error('boom'))
    render(<CustomerPaymentsSection customerId={3} />)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Ödemeler yüklenirken bir hata oluştu.')
    })
  })

  it('opens the add-payment modal from the header button', async () => {
    render(<CustomerPaymentsSection customerId={3} />)
    await screen.findByText('Müşteri 7')
    await userEvent.click(screen.getByLabelText('Ödeme Ekle'))
    expect(screen.getByTestId('add-payment-modal')).toBeInTheDocument()
  })

  it('tolerates a non-paginated array response', async () => {
    getAppointmentPaymentsByCustomer.mockResolvedValue({ data: payments })
    render(<CustomerPaymentsSection customerId={3} />)
    expect(await screen.findByText('Müşteri 7')).toBeInTheDocument()
  })
})
