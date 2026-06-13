import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UserListPage from '../../src/pages/UserListPage.jsx'

vi.mock('../../src/components/EditProfileModal.jsx', () => ({
  default: ({ onClose }) => <div data-testid="edit-modal"><button onClick={onClose}>Close</button></div>,
}))

vi.mock('../../src/services/user.js', () => ({
  updateUser: vi.fn(),
}))

describe('UserListPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<UserListPage />)
    expect(container).toBeDefined()
  })

  it('does not show edit modal initially', () => {
    render(<UserListPage />)
    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument()
  })
})
