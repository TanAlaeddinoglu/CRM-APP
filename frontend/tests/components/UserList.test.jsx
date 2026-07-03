import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import UserList from '../../src/components/UserList.jsx'

vi.mock('../../src/services/user.js', () => ({
  getUsers: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../src/context/PageTransitionContext.jsx', () => ({
  usePageTransition: vi.fn(),
}))

vi.mock('../../src/components/export/ExportActionButton.jsx', () => ({
  default: () => <div data-testid="export-button" />,
}))

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { getUsers, updateUser } from '../../src/services/user.js'
import { useAuth } from '../../src/context/AuthContext.jsx'
import { toast } from 'react-hot-toast'

const users = [
  { id: 1, username: 'admin1', first_name: 'Ada', last_name: 'Min', email: 'admin@b.com', role: 'ADMIN', is_active: true },
  { id: 2, username: 'user1', first_name: 'Uğur', last_name: 'Kul', email: 'user@b.com', role: 'USER', is_active: false },
]

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.mockReturnValue({ user: { role: 'ADMIN', email: 'a@b.com' } })
  getUsers.mockResolvedValue({ data: users })
  updateUser.mockResolvedValue({})
})

describe('UserList', () => {
  it('renders nothing for non-admin users', () => {
    useAuth.mockReturnValue({ user: { role: 'USER' } })
    const { container } = render(<UserList />)
    expect(container).toBeEmptyDOMElement()
    expect(getUsers).not.toHaveBeenCalled()
  })

  it('loads users on mount and renders rows for admins', async () => {
    render(<UserList />)
    await waitFor(() => expect(getUsers).toHaveBeenCalled())
    expect(await screen.findByText('admin1')).toBeInTheDocument()
    expect(screen.getByText('user1')).toBeInTheDocument()
  })

  it('renders active/inactive status badges', async () => {
    const { container } = render(<UserList />)
    await screen.findByText('admin1')
    expect(container.querySelector('.status.active')).toHaveTextContent('Aktif')
    expect(container.querySelector('.status.inactive')).toHaveTextContent('Pasif')
  })

  it('filters by search term', async () => {
    render(<UserList />)
    await screen.findByText('admin1')
    await userEvent.type(screen.getByPlaceholderText('Kullanıcı ara...'), 'uğur')
    await waitFor(() => expect(screen.queryByText('admin1')).not.toBeInTheDocument())
    expect(screen.getByText('user1')).toBeInTheDocument()
  })

  it('filters by role', async () => {
    render(<UserList />)
    await screen.findByText('admin1')
    await userEvent.selectOptions(screen.getByDisplayValue('Tüm Roller'), 'ADMIN')
    await waitFor(() => expect(screen.queryByText('user1')).not.toBeInTheDocument())
    expect(screen.getByText('admin1')).toBeInTheDocument()
  })

  it('filters by status', async () => {
    render(<UserList />)
    await screen.findByText('admin1')
    await userEvent.selectOptions(screen.getByDisplayValue('Tüm Durumlar'), 'INACTIVE')
    await waitFor(() => expect(screen.queryByText('admin1')).not.toBeInTheDocument())
    expect(screen.getByText('user1')).toBeInTheDocument()
  })

  it('sorts by username and toggles direction', async () => {
    render(<UserList />)
    await screen.findByText('admin1')
    await userEvent.click(screen.getByText('Kullanıcı Adı'))
    let rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('admin1')).toBeInTheDocument()
    // toggle to desc
    await userEvent.click(screen.getByText('Kullanıcı Adı'))
    rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('user1')).toBeInTheDocument()
  })

  it('sorts by status (is_active boolean)', async () => {
    render(<UserList />)
    await screen.findByText('admin1')
    await userEvent.click(screen.getByText('Durum'))
    const rows = screen.getAllByRole('row').slice(1)
    // asc: inactive (0) first → user1
    expect(within(rows[0]).getByText('user1')).toBeInTheDocument()
  })

  describe('edit flow', () => {
    it('updates a user and reloads', async () => {
      render(<UserList />)
      await screen.findByText('admin1')
      await userEvent.click(screen.getAllByLabelText('Düzenle')[0])
      expect(screen.getByText('Profili Düzenle')).toBeInTheDocument()
      await userEvent.click(screen.getByText('Kaydet'))
      await waitFor(() => expect(updateUser).toHaveBeenCalled())
      expect(getUsers).toHaveBeenCalledTimes(2)
    })

    it('shows an error toast when update fails', async () => {
      updateUser.mockRejectedValue(new Error('fail'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      render(<UserList />)
      await screen.findByText('admin1')
      await userEvent.click(screen.getAllByLabelText('Düzenle')[0])
      await userEvent.click(screen.getByText('Kaydet'))
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Kullanıcı güncellenemedi.'))
    })
  })
})
