import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProfileDetails from '../../src/components/ProfileDetails.jsx'

vi.mock('../../src/utils/roles.js', () => ({
  isAdmin: vi.fn(),
}))

import { isAdmin } from '../../src/utils/roles.js'

const user = {
  email: 'ahmet@b.com',
  username: 'ahmet',
  first_name: 'Ahmet',
  last_name: 'Yılmaz',
  role: 'ADMIN',
  last_login: '2024-03-15T10:30:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdmin.mockReturnValue(true)
})

describe('ProfileDetails', () => {
  it('renders all profile fields', () => {
    render(<ProfileDetails user={user} />)
    expect(screen.getByText('Profil Bilgileri')).toBeInTheDocument()
    expect(screen.getByText('ahmet@b.com')).toBeInTheDocument()
    expect(screen.getByText('ahmet')).toBeInTheDocument()
    expect(screen.getByText('Ahmet')).toBeInTheDocument()
    expect(screen.getByText('Yılmaz')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })

  it('formats the last login date', () => {
    render(<ProfileDetails user={user} />)
    // tr-TR formatted date contains day.month.year
    expect(screen.getByText(/15\.03\.2024/)).toBeInTheDocument()
  })

  it('shows a dash when last login is missing', () => {
    render(<ProfileDetails user={{ ...user, last_login: null }} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('shows the raw value for an unparseable last login', () => {
    render(<ProfileDetails user={{ ...user, last_login: 'not-a-date' }} />)
    expect(screen.getByText('not-a-date')).toBeInTheDocument()
  })

  describe('admin actions', () => {
    it('shows edit and add-user buttons for admins', () => {
      isAdmin.mockReturnValue(true)
      render(<ProfileDetails user={user} />)
      expect(screen.getByLabelText('Profili Düzenle')).toBeInTheDocument()
      expect(screen.getByLabelText('Kullanıcı Ekle')).toBeInTheDocument()
    })

    it('hides action buttons for non-admins', () => {
      isAdmin.mockReturnValue(false)
      render(<ProfileDetails user={user} />)
      expect(screen.queryByLabelText('Profili Düzenle')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Kullanıcı Ekle')).not.toBeInTheDocument()
    })

    it('fires onEdit and onAddUser callbacks', async () => {
      isAdmin.mockReturnValue(true)
      const onEdit = vi.fn()
      const onAddUser = vi.fn()
      render(<ProfileDetails user={user} onEdit={onEdit} onAddUser={onAddUser} />)
      await userEvent.click(screen.getByLabelText('Profili Düzenle'))
      await userEvent.click(screen.getByLabelText('Kullanıcı Ekle'))
      expect(onEdit).toHaveBeenCalled()
      expect(onAddUser).toHaveBeenCalled()
    })
  })
})
