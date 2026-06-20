import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import CustomerList from '../../src/components/CustomerList.jsx'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => navigateMock }
})

const customers = [
  {
    id: 1, customer_name: 'Beta', customer_surname: 'Yıldız', customer_email: 'b@b.com',
    customer_phone: '555', city: 'İzmir', tag: 'VIP', tag_timer_days: 3, status: 'active',
    assigned_to: 'ahmet', products: [{ id: 1, product: 'Diyabet' }], updated_at: '2024-01-01T00:00:00Z', source: 'web',
  },
  {
    id: 2, customer_name: 'Alfa', customer_surname: 'Demir', customer_email: '', customer_phone: '',
    city: '', tag: null, tag_timer_days: 9, status: 'archived',
    assigned_to: '', products: [], updated_at: '2024-02-01T00:00:00Z', source: 'tel',
  },
]

beforeEach(() => vi.clearAllMocks())

function renderList(props = {}, initialEntries = ['/customers']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CustomerList customers={customers} totalCount={2} {...props} />
    </MemoryRouter>
  )
}

describe('CustomerList', () => {
  it('renders column headers and rows', () => {
    renderList()
    expect(screen.getByText('Ad')).toBeInTheDocument()
    expect(screen.getByText('Hastalıklar')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Alfa')).toBeInTheDocument()
  })

  it('shows the empty state when there are no customers', () => {
    render(
      <MemoryRouter>
        <CustomerList customers={[]} totalCount={0} />
      </MemoryRouter>
    )
    expect(screen.getByText('Kayıt bulunamadı')).toBeInTheDocument()
  })

  describe('tag display', () => {
    it('shows the tag name when present', () => {
      renderList()
      expect(screen.getByText('VIP')).toBeInTheDocument()
    })

    it('shows "Archive" for archived customers', () => {
      renderList()
      expect(screen.getByText('Archive')).toBeInTheDocument()
    })

    it('shows "Pool" when a non-archived customer has no tag', () => {
      const noTag = [{ ...customers[0], id: 3, tag: null, status: 'active' }]
      render(<MemoryRouter><CustomerList customers={noTag} totalCount={1} /></MemoryRouter>)
      expect(screen.getByText('Pool')).toBeInTheDocument()
    })

    it('applies the danger class to a tag timer >= 7 days', () => {
      const { container } = renderList()
      const pills = container.querySelectorAll('.tag-timer-pill')
      const danger = [...pills].find((p) => p.classList.contains('danger'))
      expect(danger).toHaveTextContent('9 gün')
    })
  })

  it('renders product badges', () => {
    renderList()
    expect(screen.getByText('Diyabet')).toBeInTheDocument()
  })

  describe('sorting', () => {
    it('sorts by name ascending and shows the arrow', async () => {
      renderList()
      await userEvent.click(screen.getByText('Ad'))
      const rows = screen.getAllByRole('row').slice(1)
      expect(within(rows[0]).getByText('Alfa')).toBeInTheDocument()
      expect(screen.getByText(/Ad ▲/)).toBeInTheDocument()
    })

    it('toggles to descending on a second click', async () => {
      renderList()
      await userEvent.click(screen.getByText('Ad'))
      await userEvent.click(screen.getByText(/Ad/))
      const rows = screen.getAllByRole('row').slice(1)
      expect(within(rows[0]).getByText('Beta')).toBeInTheDocument()
    })
  })

  describe('selection (uncontrolled)', () => {
    it('selects a single row via its checkbox', async () => {
      const { container } = renderList()
      const rowCheckboxes = container.querySelectorAll('tbody input[type="checkbox"]')
      await userEvent.click(rowCheckboxes[0])
      expect(rowCheckboxes[0]).toBeChecked()
    })

    it('selects all rows via the header checkbox', async () => {
      const { container } = renderList()
      const headerCheckbox = container.querySelector('thead input[type="checkbox"]')
      await userEvent.click(headerCheckbox)
      const rowCheckboxes = container.querySelectorAll('tbody input[type="checkbox"]')
      rowCheckboxes.forEach((cb) => expect(cb).toBeChecked())
    })
  })

  describe('selection (controlled)', () => {
    it('calls onSelectionChange with all ids on select-all', async () => {
      const onSelectionChange = vi.fn()
      renderList({ selectedIds: [], onSelectionChange })
      const headerCheckbox = document.querySelector('thead input[type="checkbox"]')
      await userEvent.click(headerCheckbox)
      expect(onSelectionChange).toHaveBeenCalledWith([1, 2])
    })
  })

  describe('navigation', () => {
    it('navigates to the customer detail on cell click', async () => {
      renderList()
      await userEvent.click(screen.getByText('Beta'))
      expect(navigateMock).toHaveBeenCalledWith('/customers/1')
    })

    it('does not navigate when a modifier key is held', () => {
      renderList()
      fireEvent.click(screen.getByText('Beta'), { metaKey: true })
      expect(navigateMock).not.toHaveBeenCalled()
    })
  })

  describe('pagination', () => {
    it('renders all page numbers when there are 7 or fewer pages', () => {
      renderList({ totalCount: 30 }) // 3 pages at size 10
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('renders ellipsis for many pages', () => {
      renderList({ totalCount: 200 }, ['/customers?page=1']) // 20 pages
      expect(screen.getByText('…')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()
    })

    it('changes the page size', async () => {
      renderList({ totalCount: 200 })
      await userEvent.selectOptions(screen.getByDisplayValue('10 / sayfa'), '25')
      expect(screen.getByDisplayValue('25 / sayfa')).toBeInTheDocument()
    })
  })
})
