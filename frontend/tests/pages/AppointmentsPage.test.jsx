import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AppointmentsPage from '../../src/pages/AppointmentsPage.jsx'

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'ADMIN', is_staff: true } }),
}))

vi.mock('../../src/services/appointment.js', () => ({
  getAppointments: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }),
  updateAppointment: vi.fn(),
  deleteAppointment: vi.fn(),
}))

vi.mock('../../src/components/AppointmentCalendar.jsx', () => ({
  default: () => <div data-testid="calendar" />,
}))

describe('AppointmentsPage', () => {
  it('renders without crashing (dead code: onEventClick defined but not passed)', () => {
    const { container } = render(<AppointmentsPage />)
    expect(container).toBeDefined()
  })
})
