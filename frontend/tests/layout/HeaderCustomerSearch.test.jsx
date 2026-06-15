import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HeaderCustomerSearch from '../../src/layout/HeaderCustomerSearch.jsx'

vi.mock('../../src/services/customer.js', () => ({
  getCustomers: vi.fn(),
  getMyCustomers: vi.fn(),
}))

import { getCustomers, getMyCustomers } from '../../src/services/customer.js'

beforeEach(() => {
  vi.clearAllMocks()
  getCustomers.mockResolvedValue({ data: { results: [] } })
  getMyCustomers.mockResolvedValue({ data: { results: [] } })
})

function renderSearch(role = 'ADMIN') {
  return render(
    <MemoryRouter>
      <HeaderCustomerSearch role={role} />
    </MemoryRouter>
  )
}

describe('HeaderCustomerSearch', () => {
  it('renders search input', () => {
    renderSearch()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('does not search when query is less than 3 chars', async () => {
    renderSearch()
    await userEvent.type(screen.getByRole('textbox'), 'al')
    // Wait longer than debounce
    await new Promise(r => setTimeout(r, 400))
    expect(getCustomers).not.toHaveBeenCalled()
  })

  it('searches when query is 3+ chars (debounced)', async () => {
    getCustomers.mockResolvedValue({ data: { results: [
      { id: 1, customer_name: 'Ali', customer_surname: 'Veli', customer_phone: '555' },
    ] } })
    renderSearch('ADMIN')
    await userEvent.type(screen.getByRole('textbox'), 'ali')
    await waitFor(() => {
      expect(getCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'ali' })
      )
    }, { timeout: 1000 })
  })

  it('uses getMyCustomers for non-admin role', async () => {
    getMyCustomers.mockResolvedValue({ data: { results: [] } })
    renderSearch('USER')
    await userEvent.type(screen.getByRole('textbox'), 'ali')
    await waitFor(() => {
      expect(getMyCustomers).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('uses getCustomers for admin role', async () => {
    renderSearch('ADMIN')
    await userEvent.type(screen.getByRole('textbox'), 'ali')
    await waitFor(() => {
      expect(getCustomers).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('uses getCustomers for staff role', async () => {
    renderSearch('staff')
    await userEvent.type(screen.getByRole('textbox'), 'ali')
    await waitFor(() => {
      expect(getCustomers).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('logs error on failed search (bug — error only logged, not shown)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getCustomers.mockRejectedValue({ response: { status: 500, data: 'Error' } })
    renderSearch()
    await userEvent.type(screen.getByRole('textbox'), 'ali')
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    }, { timeout: 1000 })
    consoleSpy.mockRestore()
  })

  it('clears results when query drops below 3 chars', async () => {
    getCustomers.mockResolvedValue({ data: { results: [
      { id: 1, customer_name: 'Ali', customer_surname: 'Veli', customer_phone: '555' },
    ] } })
    renderSearch()
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'ali')
    await waitFor(() => expect(getCustomers).toHaveBeenCalled(), { timeout: 1000 })
    await userEvent.clear(input)
    await userEvent.type(input, 'al')
    // Results should be cleared
    await waitFor(() => {
      expect(screen.queryAllByText(/Ali/).length).toBe(0)
    })
  })
})
