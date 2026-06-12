import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumbs from '../../src/layout/Breadcrumbs.jsx'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
    </MemoryRouter>
  )
}

describe('Breadcrumbs', () => {
  it('returns null for root path', () => {
    const { container } = renderAt('/')
    expect(container.firstChild).toBeNull()
  })

  it('renders single segment', () => {
    renderAt('/customers')
    expect(screen.getByText(/customers/)).toBeInTheDocument()
  })

  it('renders multiple segments with separators', () => {
    renderAt('/customers/123')
    expect(screen.getByText(/customers/)).toBeInTheDocument()
    expect(screen.getByText(/123/)).toBeInTheDocument()
    expect(screen.getByText(/\//)).toBeInTheDocument()
  })

  it('renders deep path', () => {
    renderAt('/settings/notifications/email')
    expect(screen.getByText(/settings/)).toBeInTheDocument()
    expect(screen.getByText(/notifications/)).toBeInTheDocument()
    expect(screen.getByText(/email/)).toBeInTheDocument()
  })

  it('does not render separator after last segment', () => {
    renderAt('/customers')
    // Only one span with no separator
    const separators = screen.queryAllByText('/')
    expect(separators.length).toBe(0)
  })
})
