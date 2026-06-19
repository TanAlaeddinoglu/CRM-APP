import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppointmentCalendar from '../../src/components/AppointmentCalendar.jsx'
import { PageTransitionProvider } from '../../src/context/PageTransitionContext.jsx'
import { getAppointments } from '../../src/services/appointment'

const calState = vi.hoisted(() => ({
  activeStart: new Date('2026-05-01T00:00:00'),
  activeEnd: new Date('2026-06-01T00:00:00'),
}))
const captured = vi.hoisted(() => ({ slotMinTime: null, slotMaxTime: null }))
const mockUseAuth = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())

// Rich FullCalendar mock that exercises eventContent / eventDidMount / eventClick.
vi.mock('@fullcalendar/react', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef((props, ref) => {
      React.useImperativeHandle(ref, () => ({
        getApi: () => ({
          view: { type: 'timeGridWeek' },
          getDate: () => calState.activeStart,
          gotoDate: vi.fn(),
          changeView: vi.fn(),
        }),
      }))

      captured.slotMinTime = props.slotMinTime
      captured.slotMaxTime = props.slotMaxTime

      React.useEffect(() => {
        props.datesSet?.({
          view: {
            type: 'timeGridWeek',
            activeStart: calState.activeStart,
            activeEnd: calState.activeEnd,
            calendar: { getDate: () => calState.activeStart },
          },
        })
      }, [])

      React.useEffect(() => {
        props.events.forEach((event) => {
          // non-list view content (time + title branch)
          props.eventContent?.({
            event: { extendedProps: event.extendedProps, title: event.title },
            view: { type: 'timeGridWeek' },
            timeText: '10:00',
          })
          // list view content (detailed branch, incl. notes)
          props.eventContent?.({
            event: { extendedProps: event.extendedProps, title: event.title },
            view: { type: 'listMonth' },
            timeText: '',
          })
          // eventDidMount styling on a real element with td/a/dot children
          const el = document.createElement('div')
          el.innerHTML =
            '<td></td><a href="#">x</a><span class="fc-list-event-dot"></span>'
          props.eventDidMount?.({
            event: {
              backgroundColor: event.backgroundColor,
              borderColor: event.borderColor,
              textColor: event.textColor,
            },
            el,
          })
        })
      }, [props.events])

      return (
        <div data-testid="full-calendar">
          {props.events.map((event) => (
            <button
              key={event.id}
              onClick={() =>
                props.eventClick?.({
                  view: {
                    type: 'timeGridWeek',
                    calendar: { getDate: () => calState.activeStart },
                  },
                  event: { extendedProps: event.extendedProps },
                })
              }
            >
              {event.title}
            </button>
          ))}
        </div>
      )
    }),
  }
})

vi.mock('@fullcalendar/daygrid', () => ({ default: {} }))
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }))
vi.mock('@fullcalendar/interaction', () => ({ default: {} }))
vi.mock('@fullcalendar/list', () => ({ default: {} }))
vi.mock('@fullcalendar/core/locales/tr', () => ({ default: {} }))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../src/services/appointment', () => ({
  getAppointments: vi.fn(),
  updateAppointment: vi.fn(),
  deleteAppointment: vi.fn(),
}))

// Detail modal renders the selected customer so we can assert eventClick wired through.
vi.mock('../../src/components/AppointmentDetailModal', () => ({
  default: ({ appointment }) =>
    appointment ? <div data-testid="detail-modal">{appointment.customer}</div> : null,
}))

vi.mock('../../src/components/customer/events/EventModal.jsx', () => ({
  default: () => null,
}))

vi.mock('../../src/components/export/ExportActionButton.jsx', () => ({
  default: () => <button type="button">Export</button>,
}))

function renderCalendar() {
  return render(
    <MemoryRouter>
      <PageTransitionProvider>
        <AppointmentCalendar />
      </PageTransitionProvider>
    </MemoryRouter>
  )
}

const apptInHours = {
  id: 1,
  customer: 'Ayşe <Doe>',
  name: 'Kontrol',
  product: 'Diyabet',
  appointment_type: 'muayene',
  status: 'satis',
  notes: 'önemli not',
  scheduled_for: '2026-05-05T10:00:00',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({ user: { email: 'admin@b.com', role: 'ADMIN' } })
  calState.activeStart = new Date('2026-05-01T00:00:00')
  calState.activeEnd = new Date('2026-06-01T00:00:00')
  captured.slotMinTime = null
  captured.slotMaxTime = null
})

describe('AppointmentCalendar callbacks', () => {
  it('renders event content and applies eventDidMount styling without crashing', async () => {
    getAppointments.mockResolvedValue({ data: { count: 1, results: [apptInHours] } })
    renderCalendar()
    expect(await screen.findByText('Ayşe <Doe> • Kontrol')).toBeInTheDocument()
  })

  it('opens the detail modal when an event is clicked', async () => {
    getAppointments.mockResolvedValue({ data: { count: 1, results: [apptInHours] } })
    renderCalendar()
    const eventBtn = await screen.findByText('Ayşe <Doe> • Kontrol')
    await userEvent.click(eventBtn)
    expect(await screen.findByTestId('detail-modal')).toHaveTextContent('Ayşe <Doe>')
  })

  it('handles a non-paginated array response (results-less data)', async () => {
    getAppointments.mockResolvedValue({ data: [apptInHours] })
    renderCalendar()
    expect(await screen.findByText('Ayşe <Doe> • Kontrol')).toBeInTheDocument()
  })

  it('expands time bounds when an off-hours appointment exists', async () => {
    const offHours = { ...apptInHours, id: 2, scheduled_for: '2026-05-05T22:00:00' }
    getAppointments.mockResolvedValue({ data: { count: 1, results: [offHours] } })
    renderCalendar()
    await screen.findByText('Ayşe <Doe> • Kontrol')
    await waitFor(() => {
      expect(captured.slotMinTime).toBe('00:00:00')
      expect(captured.slotMaxTime).toBe('24:00:00')
    })
  })

  it('keeps default time bounds for in-hours appointments', async () => {
    getAppointments.mockResolvedValue({ data: { count: 1, results: [apptInHours] } })
    renderCalendar()
    await screen.findByText('Ayşe <Doe> • Kontrol')
    await waitFor(() => {
      expect(captured.slotMinTime).toBe('06:00:00')
      expect(captured.slotMaxTime).toBe('21:00:00')
    })
  })
})
