import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../../src/layout/Sidebar.jsx'

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../../src/context/AuthContext.jsx'

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.mockReturnValue({ user: { is_staff: true } })
})

function renderSidebar(initialPath = '/customers') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('renders core menu items always visible', () => {
    renderSidebar()
    expect(screen.getByText('Müşteriler')).toBeInTheDocument()
    expect(screen.getByText('Randevular')).toBeInTheDocument()
    expect(screen.getByText('Ürünler')).toBeInTheDocument()
    expect(screen.getByText('Etiketler')).toBeInTheDocument()
  })

  describe('staff user (is_staff: true)', () => {
    beforeEach(() => useAuth.mockReturnValue({ user: { is_staff: true } }))

    it('shows staff-only items', () => {
      renderSidebar()
      expect(screen.getByText('Ödemeler')).toBeInTheDocument()
      expect(screen.getByText('Raporlar')).toBeInTheDocument()
      expect(screen.getByText('Dışa Aktarma Geçmişi')).toBeInTheDocument()
    })

    it('does not show "Performansım"', () => {
      renderSidebar()
      expect(screen.queryByText('Performansım')).not.toBeInTheDocument()
    })
  })

  describe('non-staff user (is_staff: false)', () => {
    beforeEach(() => useAuth.mockReturnValue({ user: { is_staff: false } }))

    it('shows "Performansım"', () => {
      renderSidebar()
      expect(screen.getByText('Performansım')).toBeInTheDocument()
    })

    it('hides staff-only items', () => {
      renderSidebar()
      expect(screen.queryByText('Ödemeler')).not.toBeInTheDocument()
      expect(screen.queryByText('Raporlar')).not.toBeInTheDocument()
      expect(screen.queryByText('Dışa Aktarma Geçmişi')).not.toBeInTheDocument()
    })
  })

  it('defaults to staff items when user is null (canSeeStaffItems defaults true)', () => {
    useAuth.mockReturnValue({ user: null })
    renderSidebar()
    expect(screen.getByText('Ödemeler')).toBeInTheDocument()
    expect(screen.getByText('Raporlar')).toBeInTheDocument()
  })

  it('defaults to staff items when useAuth returns undefined', () => {
    useAuth.mockReturnValue(undefined)
    renderSidebar()
    expect(screen.getByText('Raporlar')).toBeInTheDocument()
  })

  it('toggles collapsed class and hides labels when collapse button clicked', async () => {
    const { container } = renderSidebar()
    const sidebar = container.querySelector('.sidebar')
    expect(sidebar).not.toHaveClass('collapsed')
    // labels visible
    expect(screen.getByText('Müşteriler')).toBeInTheDocument()

    const collapseBtn = container.querySelector('.collapse-btn')
    await userEvent.click(collapseBtn)

    expect(sidebar).toHaveClass('collapsed')
    // labels hidden when collapsed
    expect(screen.queryByText('Müşteriler')).not.toBeInTheDocument()
  })

  it('marks the nav item matching the current route as active', () => {
    const { container } = renderSidebar('/reports')
    const activeItem = container.querySelector('.nav-item.active')
    expect(activeItem).toBeInTheDocument()
    expect(activeItem).toHaveTextContent('Raporlar')
  })

  it('renders the logo link when not collapsed', () => {
    const { container } = renderSidebar()
    expect(container.querySelector('.sidebar-logo')).toBeInTheDocument()
  })

  it('hides the logo when collapsed', async () => {
    const { container } = renderSidebar()
    await userEvent.click(container.querySelector('.collapse-btn'))
    expect(container.querySelector('.sidebar-logo')).not.toBeInTheDocument()
  })
})
