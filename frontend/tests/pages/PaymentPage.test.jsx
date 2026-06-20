import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PaymentPage from '../../src/pages/PaymentPage.jsx'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../../src/services/events.js', () => ({
  getAppointmentPayments: vi.fn(),
  getAppointmentById: vi.fn(),
}))

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { email: 'a@b.com' } }),
}))

vi.mock('../../src/context/PageTransitionContext.jsx', () => ({
  usePageTransition: vi.fn(),
}))

vi.mock('../../src/components/export/ExportActionButton.jsx', () => ({
  default: () => <div data-testid="export-button" />,
}))

vi.mock('../../src/components/payment/PaymentCustomerRow.jsx', () => ({
  default: ({ payments }) => (
    <div data-testid="customer-row">{payments.length} ödeme</div>
  ),
}))

vi.mock('../../src/components/payment/AddPaymentModal.jsx', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="add-payment-modal" /> : null),
}))

import {
  getAppointmentPayments,
  getAppointmentById,
} from '../../src/services/events.js'

const payments = [
  { id: 1, appointment: 7, paid_amount: 500 },
  { id: 2, appointment: 7, paid_amount: 300 },
  { id: 3, appointment: 8, paid_amount: 1000 },
]

beforeEach(() => {
  vi.clearAllMocks()
  getAppointmentPayments.mockResolvedValue({ data: { results: payments, count: 3 } })
  getAppointmentById.mockImplementation((id) =>
    Promise.resolve({ data: { id, customer: `Müşteri ${id}` } })
  )
})

function renderPage(initialEntries = ['/payments']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PaymentPage />
    </MemoryRouter>
  )
}

describe('PaymentPage', () => {
  it('fetches payments on mount with default paging', async () => {
    renderPage()
    await waitFor(() => {
      expect(getAppointmentPayments).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, page_size: 10 })
      )
    })
  })

  it('groups payments by appointment into customer rows', async () => {
    renderPage()
    await waitFor(() => {
      // two unique appointments → two rows
      expect(screen.getAllByTestId('customer-row')).toHaveLength(2)
    })
    expect(screen.getByText('2 ödeme')).toBeInTheDocument()
    expect(screen.getByText('1 ödeme')).toBeInTheDocument()
  })

  it('shows empty state when there are no payments', async () => {
    getAppointmentPayments.mockResolvedValue({ data: { results: [], count: 0 } })
    renderPage()
    expect(await screen.findByText('Henüz ödeme bulunmuyor.')).toBeInTheDocument()
  })

  it('navigates to payment history', async () => {
    renderPage()
    await waitFor(() => expect(getAppointmentPayments).toHaveBeenCalled())
    await userEvent.click(screen.getByText('Ödeme Geçmişi'))
    expect(navigateMock).toHaveBeenCalledWith('/payments/history')
  })

  it('opens the add-payment modal', async () => {
    renderPage()
    await waitFor(() => expect(getAppointmentPayments).toHaveBeenCalled())
    expect(screen.queryByTestId('add-payment-modal')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTitle('Ödeme Ekle'))
    expect(screen.getByTestId('add-payment-modal')).toBeInTheDocument()
  })

  it('shows the total record count', async () => {
    renderPage()
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByText(/kayıt/)).toBeInTheDocument()
  })

  it('debounces the search box into the URL and a new request (>=3 chars)', async () => {
    renderPage()
    await waitFor(() => expect(getAppointmentPayments).toHaveBeenCalled())
    await userEvent.type(screen.getByPlaceholderText('Müşteri ara...'), 'ali')
    await waitFor(() => {
      expect(getAppointmentPayments).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'ali' })
      )
    }, { timeout: 1000 })
  })

  it('does not search when fewer than 3 chars are typed', async () => {
    renderPage()
    await waitFor(() => expect(getAppointmentPayments).toHaveBeenCalled())
    getAppointmentPayments.mockClear()
    await userEvent.type(screen.getByPlaceholderText('Müşteri ara...'), 'al')
    await new Promise((r) => setTimeout(r, 500))
    expect(getAppointmentPayments).not.toHaveBeenCalledWith(
      expect.objectContaining({ search: 'al' })
    )
  })

  it('changes page size', async () => {
    renderPage()
    await waitFor(() => expect(getAppointmentPayments).toHaveBeenCalled())
    await userEvent.selectOptions(screen.getByDisplayValue('10'), '25')
    await waitFor(() => {
      expect(getAppointmentPayments).toHaveBeenCalledWith(
        expect.objectContaining({ page_size: 25 })
      )
    })
  })

  it('recovers from a fetch error with an empty state', async () => {
    getAppointmentPayments.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText('Henüz ödeme bulunmuyor.')).toBeInTheDocument()
  })
})
