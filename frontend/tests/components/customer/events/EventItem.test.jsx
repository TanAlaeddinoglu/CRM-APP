import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import EventItem from '../../../../src/components/customer/events/EventItem.jsx'

const event = {
  id: 1,
  name: 'Konsültasyon',
  scheduled_for: '2024-03-15T10:00:00Z',
  appointment_type: 'online',
  status: 'pending',
  notes: 'Bring documents',
  product: 'Diabetes Treatment',
}

describe('EventItem', () => {
  it('renders event name', () => {
    render(<EventItem event={event} onClick={vi.fn()} />)
    expect(screen.getByText('Konsültasyon')).toBeInTheDocument()
  })

  it('renders appointment type', () => {
    render(<EventItem event={event} onClick={vi.fn()} />)
    expect(screen.getByText('online')).toBeInTheDocument()
  })

  it('renders status', () => {
    render(<EventItem event={event} onClick={vi.fn()} />)
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('renders formatted date', () => {
    render(<EventItem event={event} onClick={vi.fn()} />)
    // Date formatted as Turkish locale
    expect(screen.getByText(/15/)).toBeInTheDocument()
  })

  it('handles null scheduled_for gracefully', () => {
    const noDate = { ...event, scheduled_for: null }
    render(<EventItem event={noDate} onClick={vi.fn()} />)
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  it('calls onClick when row clicked', async () => {
    const onClick = vi.fn()
    render(<EventItem event={event} onClick={onClick} />)
    await userEvent.click(screen.getByText('Konsültasyon'))
    expect(onClick).toHaveBeenCalled()
  })
})
