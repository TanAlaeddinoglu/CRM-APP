import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TagPage from '../../src/pages/TagPage.jsx'

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}))

vi.mock('../../src/services/tag.js', () => ({
  getTags: vi.fn().mockResolvedValue({ data: [] }),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}))

vi.mock('../../src/components/TagList.jsx', () => ({
  default: () => <div data-testid="tag-list" />,
}))

vi.mock('../../src/components/export/ExportActionButton.jsx', () => ({
  default: () => null,
}))

describe('TagPage', () => {
  it('renders TagList component', () => {
    render(<TagPage />)
    expect(screen.getByTestId('tag-list')).toBeInTheDocument()
  })
})
