import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PaymentHistoryPage from '../../../src/components/payment/PaymentHistoryPage.jsx'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../../../src/services/events.js', () => ({
  getAppointmentPayments: vi.fn(),
  getAppointmentById: vi.fn(),
}))

vi.mock('../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { email: 'a@b.com' } }),
}))

vi.mock('../../../src/context/PageTransitionContext.jsx', () => ({
  usePageTransition: vi.fn(),
}))

vi.mock('../../../src/components/export/ExportActionButton.jsx', () => ({
  default: () => <div data-testid="export-button" />,
}))

import {
  getAppointmentPayments,
  getAppointmentById,
} from '../../../src/services/events.js'

const payments = [
  { id: 1, appointment: 7, payment_date: '2024-03-15', paid_amount: 500, remaining_amount: 200, payment_status: 'kismi' },
  { id: 2, appointment: 8, payment_date: '2024-01-10', paid_amount: 1000, remaining_amount: 0, payment_status: 'tamamlandi' },
]

beforeEach(() => {
  vi.clearAllMocks()
  getAppointmentPayments.mockResolvedValue({ data: { results: payments, count: 2 } })
  getAppointmentById.mockImplementation((id) =>
    Promise.resolve({ data: { id, customer: `Müşteri ${id}`, name: `Randevu ${id}` } })
  )
})

function renderPage() {
  return render(
    <MemoryRouter>
      <PaymentHistoryPage />
    </MemoryRouter>
  )
}

describe('PaymentHistoryPage', () => {
  it('fetches payments on mount', async () => {
    renderPage()
    await waitFor(() => {
      expect(getAppointmentPayments).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, page_size: 10 })
      )
    })
  })

  it('renders payment rows with customer info from appointments', async () => {
    renderPage()
    expect(await screen.findByText('Müşteri 7')).toBeInTheDocument()
    expect(screen.getByText('Müşteri 8')).toBeInTheDocument()
  })

  it('shows total record count', async () => {
    renderPage()
    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(screen.getByText(/kayıt/)).toBeInTheDocument()
  })

  it('debounces the customer filter into a search request', async () => {
    renderPage()
    await waitFor(() => expect(getAppointmentPayments).toHaveBeenCalled())
    await userEvent.type(
      screen.getByPlaceholderText('Müşteri adına göre filtrele'),
      'ali'
    )
    await waitFor(() => {
      expect(getAppointmentPayments).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'ali' })
      )
    }, { timeout: 1000 })
  })

  it('navigates back to /payments', async () => {
    renderPage()
    await screen.findByText('Müşteri 7')
    await userEvent.click(screen.getByText('← Ödemelere Dön'))
    expect(navigateMock).toHaveBeenCalledWith('/payments')
  })

  it('changes page size', async () => {
    renderPage()
    await screen.findByText('Müşteri 7')
    const select = screen.getByDisplayValue('10')
    await userEvent.selectOptions(select, '25')
    await waitFor(() => {
      expect(getAppointmentPayments).toHaveBeenCalledWith(
        expect.objectContaining({ page_size: 25 })
      )
    })
  })

  it('filters out rows outside the selected date range', async () => {
    const { container } = renderPage()
    // both rows initially present
    expect(await screen.findByText('Müşteri 7')).toBeInTheDocument()
    expect(screen.getByText('Müşteri 8')).toBeInTheDocument()

    // the second date input is the "to" date — exclude the 2024-03-15 payment
    const dateInputs = container.querySelectorAll('input[type="date"]')
    await userEvent.type(dateInputs[1], '2024-02-01')

    await waitFor(() => {
      expect(screen.queryByText('Müşteri 7')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Müşteri 8')).toBeInTheDocument()
  })

  it('renders empty table on fetch error without crashing', async () => {
    getAppointmentPayments.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText(/Kayıt bulunamadı/)).toBeInTheDocument()
  })
})
