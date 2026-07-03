import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddPaymentModal from '../../../src/components/payment/AddPaymentModal.jsx'

vi.mock('../../../src/services/events.js', () => ({
  createAppointmentPayment: vi.fn(),
  getAppointments: vi.fn(),
  getAppointmentPayments: vi.fn(),
  getAppointmentById: vi.fn(),
}))

vi.mock('react-hot-toast', () => {
  const toast = vi.fn()
  toast.success = vi.fn()
  toast.error = vi.fn()
  return { default: toast }
})

import {
  createAppointmentPayment,
  getAppointments,
  getAppointmentPayments,
  getAppointmentById,
} from '../../../src/services/events.js'
import toast from 'react-hot-toast'

beforeEach(() => {
  vi.clearAllMocks()
  getAppointments.mockResolvedValue({ data: { results: [] } })
  getAppointmentPayments.mockResolvedValue({ data: { results: [] } })
  getAppointmentById.mockResolvedValue({ data: { customer: 'Ali Veli', product: 'Paket A' } })
  createAppointmentPayment.mockResolvedValue({})
})

describe('AddPaymentModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AddPaymentModal isOpen={false} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the modal title when open', () => {
    render(<AddPaymentModal isOpen onClose={vi.fn()} />)
    expect(screen.getByText('Ödeme Başlat')).toBeInTheDocument()
  })

  describe('appointmentId mode', () => {
    it('loads and displays the appointment label via getAppointmentById', async () => {
      render(<AddPaymentModal isOpen onClose={vi.fn()} appointmentId={5} />)
      await waitFor(() => {
        expect(getAppointmentById).toHaveBeenCalledWith(5)
      })
      await waitFor(() => {
        expect(screen.getByDisplayValue('Ali Veli')).toBeInTheDocument()
      })
    })

    it('falls back to "Appointment #id" label when fetch fails', async () => {
      getAppointmentById.mockRejectedValue(new Error('fail'))
      render(<AddPaymentModal isOpen onClose={vi.fn()} appointmentId={9} />)
      await waitFor(() => {
        expect(screen.getByDisplayValue('Appointment #9')).toBeInTheDocument()
      })
    })
  })

  describe('customerId mode', () => {
    it('loads customer appointments via getAppointments', async () => {
      getAppointments.mockResolvedValue({
        data: { results: [{ id: 1, name: 'Randevu A', status: 'satis', product: 'Paket A' }] },
      })
      render(<AddPaymentModal isOpen onClose={vi.fn()} customerId={3} />)
      await waitFor(() => {
        expect(getAppointments).toHaveBeenCalledWith(expect.objectContaining({ customerId: 3 }))
      })
      expect(await screen.findByText('Randevu A')).toBeInTheDocument()
    })

    it('shows "no appointments" message when customer has none', async () => {
      getAppointments.mockResolvedValue({ data: { results: [] } })
      render(<AddPaymentModal isOpen onClose={vi.fn()} customerId={3} />)
      expect(await screen.findByText('Bu müşteriye ait randevu bulunamadı.')).toBeInTheDocument()
    })
  })

  describe('free search mode', () => {
    it('warns when fewer than 2 characters are typed', async () => {
      render(<AddPaymentModal isOpen onClose={vi.fn()} />)
      const input = screen.getByPlaceholderText('Müşteri adı, telefon veya randevu adı ile ara')
      await userEvent.type(input, 'a')
      expect(await screen.findByText('Arama için en az 2 karakter gir.')).toBeInTheDocument()
      expect(getAppointments).not.toHaveBeenCalled()
    })

    it('searches (debounced) and renders results', async () => {
      getAppointments.mockResolvedValue({
        data: { results: [{ id: 1, customer: 'Ali Veli', status: 'satis', product: 'Paket A' }] },
      })
      render(<AddPaymentModal isOpen onClose={vi.fn()} />)
      await userEvent.type(screen.getByPlaceholderText('Müşteri adı, telefon veya randevu adı ile ara'), 'ali')
      await waitFor(() => {
        expect(getAppointments).toHaveBeenCalledWith(expect.objectContaining({ search: 'ali' }))
      }, { timeout: 1000 })
      expect(await screen.findByText('Ali Veli')).toBeInTheDocument()
    })

    it('shows "no results" when search returns nothing', async () => {
      getAppointments.mockResolvedValue({ data: { results: [] } })
      render(<AddPaymentModal isOpen onClose={vi.fn()} />)
      await userEvent.type(screen.getByPlaceholderText('Müşteri adı, telefon veya randevu adı ile ara'), 'xyz')
      expect(await screen.findByText('Sonuç bulunamadı.', {}, { timeout: 1000 })).toBeInTheDocument()
    })
  })

  describe('appointment selection', () => {
    it('rejects non-satis appointments with an error toast', async () => {
      getAppointments.mockResolvedValue({
        data: { results: [{ id: 1, customer: 'Ali Veli', status: 'beklemede', product: 'Paket A' }] },
      })
      render(<AddPaymentModal isOpen onClose={vi.fn()} />)
      await userEvent.type(screen.getByPlaceholderText('Müşteri adı, telefon veya randevu adı ile ara'), 'ali')
      const result = await screen.findByText('Ali Veli', {}, { timeout: 1000 })
      await userEvent.click(result)
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Satış'),
        expect.anything()
      )
    })

    it('selects a satis appointment and locks its label', async () => {
      getAppointments.mockResolvedValue({
        data: { results: [{ id: 1, customer: 'Ali Veli', status: 'satis', product: 'Paket A' }] },
      })
      render(<AddPaymentModal isOpen onClose={vi.fn()} />)
      await userEvent.type(screen.getByPlaceholderText('Müşteri adı, telefon veya randevu adı ile ara'), 'ali')
      const result = await screen.findByText('Ali Veli', {}, { timeout: 1000 })
      await userEvent.click(result)
      await waitFor(() => {
        expect(screen.getByDisplayValue('Ali Veli')).toBeInTheDocument()
      })
    })
  })

  describe('existing payment detection', () => {
    it('auto-fills and locks total amount when an existing payment is found', async () => {
      getAppointmentPayments.mockResolvedValue({
        data: { results: [{ appointment: 5, total_amount: 2000, created_at: '2024-01-01T00:00:00Z' }] },
      })
      render(<AddPaymentModal isOpen onClose={vi.fn()} appointmentId={5} />)
      expect(await screen.findByText('Mevcut ödemelerde toplam tutar kilitlidir')).toBeInTheDocument()
      const totalInput = document.querySelector('input[name="total_amount"]')
      expect(totalInput).toBeDisabled()
      expect(totalInput.value).toBe('2.000')
    })

    it('keeps total editable when no existing payment exists', async () => {
      getAppointmentPayments.mockResolvedValue({ data: { results: [] } })
      render(<AddPaymentModal isOpen onClose={vi.fn()} appointmentId={5} />)
      await waitFor(() => expect(getAppointmentPayments).toHaveBeenCalled())
      const totalInput = document.querySelector('input[name="total_amount"]')
      expect(totalInput).not.toBeDisabled()
    })
  })

  describe('amount formatting', () => {
    it('formats numeric input with tr-TR thousands separators', async () => {
      render(<AddPaymentModal isOpen onClose={vi.fn()} appointmentId={5} />)
      const paidInput = document.querySelector('input[name="paid_amount"]')
      await userEvent.type(paidInput, '12000')
      expect(paidInput.value).toBe('12.000')
    })
  })

  describe('submit', () => {
    it('validates required fields before submitting', async () => {
      render(<AddPaymentModal isOpen onClose={vi.fn()} appointmentId={5} />)
      await userEvent.click(screen.getByText('Ödeme Oluştur'))
      expect(toast.error).toHaveBeenCalledWith('Lütfen tüm zorunlu alanları doldurun.')
      expect(createAppointmentPayment).not.toHaveBeenCalled()
    })

    it('creates a payment with the correct payload on success', async () => {
      getAppointmentPayments.mockResolvedValue({ data: { results: [] } })
      const onSuccess = vi.fn()
      const onClose = vi.fn()
      render(<AddPaymentModal isOpen onClose={onClose} onSuccess={onSuccess} appointmentId={5} />)

      await userEvent.type(document.querySelector('input[name="total_amount"]'), '2000')
      await userEvent.type(document.querySelector('input[name="paid_amount"]'), '500')
      const dateInput = document.querySelector('input[name="payment_date"]')
      await userEvent.type(dateInput, '2024-03-15')

      await userEvent.click(screen.getByText('Ödeme Oluştur'))

      await waitFor(() => {
        expect(createAppointmentPayment).toHaveBeenCalledWith({
          appointment: 5,
          total_amount: '2000',
          paid_amount: '500',
          payment_date: '2024-03-15T12:00:00',
        })
      })
      expect(toast.success).toHaveBeenCalledWith('Ödeme başarıyla oluşturuldu.')
      expect(onSuccess).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    it('shows an error toast when creation fails', async () => {
      getAppointmentPayments.mockResolvedValue({ data: { results: [] } })
      createAppointmentPayment.mockRejectedValue(new Error('fail'))
      render(<AddPaymentModal isOpen onClose={vi.fn()} appointmentId={5} />)

      await userEvent.type(document.querySelector('input[name="paid_amount"]'), '500')
      await userEvent.type(document.querySelector('input[name="payment_date"]'), '2024-03-15')
      await userEvent.click(screen.getByText('Ödeme Oluştur'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Ödeme oluşturulamadı.')
      })
    })
  })

  it('calls onClose from the cancel button', async () => {
    const onClose = vi.fn()
    render(<AddPaymentModal isOpen onClose={onClose} appointmentId={5} />)
    await userEvent.click(screen.getByText('İptal'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose from the ✕ button', async () => {
    const onClose = vi.fn()
    render(<AddPaymentModal isOpen onClose={onClose} appointmentId={5} />)
    await userEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })
})
