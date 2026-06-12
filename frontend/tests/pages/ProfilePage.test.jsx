import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProfilePage from '../../src/pages/ProfilePage.jsx'

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../src/services/user.js', () => ({
  updateUser: vi.fn(),
  createUser: vi.fn(),
}))

vi.mock('../../src/components/ProfileDetails.jsx', () => ({
  default: ({ onEdit, onAddUser }) => (
    <div data-testid="profile-details">
      <button onClick={onEdit}>Edit</button>
      <button onClick={onAddUser}>Add User</button>
    </div>
  ),
}))

vi.mock('../../src/components/EditProfileModal.jsx', () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="edit-modal">
      <button onClick={() => onSave({ username: 'ali' })}>Save</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

vi.mock('../../src/components/AddUserModal.jsx', () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="add-user-modal">
      <button onClick={() => onSave({ username: 'newuser', password: 'pass', email: 'a@b.com' })}>CreateUser</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

vi.mock('../../src/components/UserList.jsx', () => ({
  default: () => <div data-testid="user-list" />,
}))

import { useAuth } from '../../src/context/AuthContext.jsx'
import { updateUser, createUser } from '../../src/services/user.js'

const adminUser = { id: 1, username: 'admin', role: 'ADMIN', is_staff: true }
const normalUser = { id: 2, username: 'user', role: 'USER', is_staff: false }

beforeEach(() => {
  vi.clearAllMocks()
  updateUser.mockResolvedValue({ data: adminUser })
  createUser.mockResolvedValue({ data: { id: 99 } })
})

describe('ProfilePage', () => {
  it('returns null when user is null', () => {
    useAuth.mockReturnValue({ user: null, setUser: vi.fn() })
    const { container } = render(<ProfilePage />)
    expect(container.firstChild).toBeNull()
  })

  it('renders profile details', () => {
    useAuth.mockReturnValue({ user: adminUser, setUser: vi.fn() })
    render(<ProfilePage />)
    expect(screen.getByTestId('profile-details')).toBeInTheDocument()
  })

  it('opens edit modal when Edit clicked', async () => {
    useAuth.mockReturnValue({ user: adminUser, setUser: vi.fn() })
    render(<ProfilePage />)
    await userEvent.click(screen.getByText('Edit'))
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
  })

  it('calls updateUser on save and closes modal', async () => {
    const setUser = vi.fn()
    useAuth.mockReturnValue({ user: adminUser, setUser })
    render(<ProfilePage />)
    await userEvent.click(screen.getByText('Edit'))
    await userEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(1, { username: 'ali' })
      expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument()
    })
  })

  it('swallows error on updateUser failure (bug #6 — no user toast)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    updateUser.mockRejectedValue(new Error('500'))
    useAuth.mockReturnValue({ user: adminUser, setUser: vi.fn() })
    render(<ProfilePage />)
    await userEvent.click(screen.getByText('Edit'))
    await userEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })
    consoleSpy.mockRestore()
  })

  it('shows UserList for ADMIN users', () => {
    useAuth.mockReturnValue({ user: adminUser, setUser: vi.fn() })
    render(<ProfilePage />)
    expect(screen.getByTestId('user-list')).toBeInTheDocument()
  })

  it('hides UserList for non-admin users', () => {
    useAuth.mockReturnValue({ user: normalUser, setUser: vi.fn() })
    render(<ProfilePage />)
    expect(screen.queryByTestId('user-list')).not.toBeInTheDocument()
  })

  it('opens add user modal (admin only)', async () => {
    useAuth.mockReturnValue({ user: adminUser, setUser: vi.fn() })
    render(<ProfilePage />)
    await userEvent.click(screen.getByText('Add User'))
    expect(screen.getByTestId('add-user-modal')).toBeInTheDocument()
  })

  it('calls createUser and closes modal', async () => {
    useAuth.mockReturnValue({ user: adminUser, setUser: vi.fn() })
    render(<ProfilePage />)
    await userEvent.click(screen.getByText('Add User'))
    await userEvent.click(screen.getByText('CreateUser'))
    await waitFor(() => {
      expect(createUser).toHaveBeenCalled()
      expect(screen.queryByTestId('add-user-modal')).not.toBeInTheDocument()
    })
  })
})
