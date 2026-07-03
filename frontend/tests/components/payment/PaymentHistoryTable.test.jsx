import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PaymentHistoryTable from '../../../src/components/payment/PaymentHistoryTable.jsx'

const rows = [
  {
    id: 1,
    payment_date: '2024-03-15',
    paid_amount: 500,
    remaining_amount: 200,
    payment_status: 'kismi',
    appointment: { customer: 'Ali Veli', name: 'Konsültasyon' },
  },
  {
    id: 2,
    payment_date: '2024-04-01',
    paid_amount: 1000,
    remaining_amount: 0,
    payment_status: 'tamamlandi',
    appointment: null,
  },
]

describe('PaymentHistoryTable', () => {
  it('shows empty state when rows is empty', () => {
    render(<PaymentHistoryTable rows={[]} />)
    expect(screen.getByText(/Kayıt bulunamadı/)).toBeInTheDocument()
  })

  it('shows empty state when rows is null', () => {
    render(<PaymentHistoryTable rows={null} />)
    expect(screen.getByText(/Kayıt bulunamadı/)).toBeInTheDocument()
  })

  it('renders payment rows', () => {
    render(<PaymentHistoryTable rows={rows} />)
    expect(screen.getByText('Ali Veli')).toBeInTheDocument()
    expect(screen.getByText('Konsültasyon')).toBeInTheDocument()
    expect(screen.getByText('500 ₺')).toBeInTheDocument()
  })

  it('shows dash for null appointment fields (bug #18 — safe null access)', () => {
    render(<PaymentHistoryTable rows={rows} />)
    // Second row has appointment=null
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('formats date correctly using day.month.year format', () => {
    render(<PaymentHistoryTable rows={rows} />)
    expect(screen.getByText('15.03.2024')).toBeInTheDocument()
  })

  it('handles empty payment_date gracefully', () => {
    const withNullDate = [{ ...rows[0], payment_date: null }]
    render(<PaymentHistoryTable rows={withNullDate} />)
    // Should show dash for null date, not crash
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders Kısmi status badge', () => {
    render(<PaymentHistoryTable rows={rows} />)
    expect(screen.getByText('Kısmi')).toBeInTheDocument()
  })

  it('renders Tamamlandı status badge', () => {
    render(<PaymentHistoryTable rows={rows} />)
    expect(screen.getByText('Tamamlandı')).toBeInTheDocument()
  })
})
