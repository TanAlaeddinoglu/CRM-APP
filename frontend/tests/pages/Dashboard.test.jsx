import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Dashboard from '../../src/pages/Dashboard.jsx'

describe('Dashboard', () => {
  it('renders without crashing (placeholder page)', () => {
    const { container } = render(<Dashboard />)
    // Dashboard is a placeholder — just verify it doesn't throw
    expect(container).toBeDefined()
  })
})
