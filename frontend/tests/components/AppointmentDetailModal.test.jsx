import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import AppointmentDetailModal from '../../src/components/AppointmentDetailModal.jsx'

const mockAppointment = {
  id: 1,
  customer: 'Ali Veli',
  customer_phone: '5551234567',
  name: 'Konsültasyon',
  product: 'Diabetes Treatment',
  appointment_type: 'online',
  status: 'pending',
  scheduled_for: '2024-03-15T10:00:00Z',
  notes: 'Please bring documents',
}

describe('AppointmentDetailModal', () => {
  it('returns null when appointment is null', () => {
    const { container } = render(
      <AppointmentDetailModal appointment={null} onClose={vi.fn()} onEdit={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders appointment details', () => {
    render(
      <AppointmentDetailModal appointment={mockAppointment} onClose={vi.fn()} onEdit={vi.fn()} />
    )
    expect(screen.getByText('Ali Veli')).toBeInTheDocument()
    expect(screen.getByText('5551234567')).toBeInTheDocument()
    expect(screen.getByText('Konsültasyon')).toBeInTheDocument()
    expect(screen.getByText('Diabetes Treatment')).toBeInTheDocument()
    expect(screen.getByText(/documents/)).toBeInTheDocument()
  })

  it('shows appointment status badge', () => {
    render(
      <AppointmentDetailModal appointment={mockAppointment} onClose={vi.fn()} onEdit={vi.fn()} />
    )
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('does not show phone section when customer_phone is null', () => {
    const noPhone = { ...mockAppointment, customer_phone: null }
    render(
      <AppointmentDetailModal appointment={noPhone} onClose={vi.fn()} onEdit={vi.fn()} />
    )
    expect(screen.queryByText('Telefon')).not.toBeInTheDocument()
  })

  it('does not show notes section when notes is null', () => {
    const noNotes = { ...mockAppointment, notes: null }
    render(
      <AppointmentDetailModal appointment={noNotes} onClose={vi.fn()} onEdit={vi.fn()} />
    )
    expect(screen.queryByText(/documents/)).not.toBeInTheDocument()
  })

  it('calls onClose when Kapat clicked', async () => {
    const onClose = vi.fn()
    render(
      <AppointmentDetailModal appointment={mockAppointment} onClose={onClose} onEdit={vi.fn()} />
    )
    await userEvent.click(screen.getByText('Kapat'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onEdit and onClose when Randevu Güncelle clicked', async () => {
    const onClose = vi.fn()
    const onEdit = vi.fn()
    render(
      <AppointmentDetailModal appointment={mockAppointment} onClose={onClose} onEdit={onEdit} />
    )
    await userEvent.click(screen.getByText('Randevu Güncelle'))
    expect(onClose).toHaveBeenCalled()
    expect(onEdit).toHaveBeenCalledWith(mockAppointment)
  })

  it('renders date formatted as Turkish locale (bug #16 — unguarded date)', () => {
    // This documents bug #16: if scheduled_for is malformed, new Date() silently returns "Invalid Date"
    render(
      <AppointmentDetailModal appointment={mockAppointment} onClose={vi.fn()} onEdit={vi.fn()} />
    )
    // Just verifying it renders without crashing for valid date
    expect(screen.getByText(/15/)).toBeInTheDocument()
  })
})
