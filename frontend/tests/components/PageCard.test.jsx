import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PageCard from '../../src/components/common/PageCard.jsx'

describe('PageCard', () => {
  it('renders children', () => {
    render(<PageCard><span>içerik</span></PageCard>)
    expect(screen.getByText('içerik')).toBeTruthy()
  })

  it('applies page-card class', () => {
    const { container } = render(<PageCard>test</PageCard>)
    expect(container.firstChild.classList.contains('page-card')).toBe(true)
  })

  it('appends extra className when provided', () => {
    const { container } = render(<PageCard className="my-wrapper">test</PageCard>)
    expect(container.firstChild.classList.contains('page-card')).toBe(true)
    expect(container.firstChild.classList.contains('my-wrapper')).toBe(true)
  })

  it('does not include trailing space when no className passed', () => {
    const { container } = render(<PageCard>test</PageCard>)
    expect(container.firstChild.className.trim()).toBe('page-card')
  })

  it('renders multiple children', () => {
    render(
      <PageCard>
        <p>Birinci</p>
        <p>İkinci</p>
      </PageCard>
    )
    expect(screen.getByText('Birinci')).toBeTruthy()
    expect(screen.getByText('İkinci')).toBeTruthy()
  })
})
