import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FilterModal from '../../src/components/FilterModal.jsx'

beforeEach(() => vi.clearAllMocks())

const initialFilters = { status: '', source: '', assigned_to: '', tag: '' }

describe('FilterModal', () => {
  it('renders filter fields', () => {
    render(<FilterModal initialFilters={initialFilters} onClose={vi.fn()} onApply={vi.fn()} />)
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Source')).toBeInTheDocument()
  })

  it('pre-fills from initialFilters', () => {
    render(
      <FilterModal
        initialFilters={{ status: 'active', source: '', assigned_to: '', tag: '' }}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    )
    const statusSelect = screen.getAllByRole('combobox')[0]
    expect(statusSelect.value).toBe('active')
  })

  it('calls onApply with form data when Apply clicked', async () => {
    const onApply = vi.fn()
    render(<FilterModal initialFilters={initialFilters} onClose={vi.fn()} onApply={onApply} />)
    await userEvent.click(screen.getByText('Uygula'))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ status: '' }))
  })

  it('calls onClose when Kapat clicked', async () => {
    const onClose = vi.fn()
    render(<FilterModal initialFilters={initialFilters} onClose={onClose} onApply={vi.fn()} />)
    await userEvent.click(screen.getByText('Kapat'))
    expect(onClose).toHaveBeenCalled()
  })

  it('can change status value', async () => {
    render(<FilterModal initialFilters={initialFilters} onClose={vi.fn()} onApply={vi.fn()} />)
    const statusSelect = screen.getAllByRole('combobox')[0]
    await userEvent.selectOptions(statusSelect, 'active')
    expect(statusSelect.value).toBe('active')
  })

  it('renders all status options', () => {
    render(<FilterModal initialFilters={initialFilters} onClose={vi.fn()} onApply={vi.fn()} />)
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('inactive')).toBeInTheDocument()
    expect(screen.getByText('pool')).toBeInTheDocument()
  })

  it('renders all source options', () => {
    render(<FilterModal initialFilters={initialFilters} onClose={vi.fn()} onApply={vi.fn()} />)
    expect(screen.getByText('manual')).toBeInTheDocument()
    expect(screen.getByText('form')).toBeInTheDocument()
    expect(screen.getByText('import')).toBeInTheDocument()
  })
})
