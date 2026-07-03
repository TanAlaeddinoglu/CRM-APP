import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditProfileModal from '../../src/components/EditProfileModal.jsx'

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from 'react-hot-toast'

const user = {
  username: 'ahmet',
  email: 'ahmet@b.com',
  first_name: 'Ahmet',
  last_name: 'Yılmaz',
  role: 'USER',
  is_active: true,
}

const labelInput = (labelText) =>
  screen.getByText(labelText).parentElement.querySelector('input, select')

beforeEach(() => vi.clearAllMocks())

describe('EditProfileModal', () => {
  it('pre-fills the form from the user prop', () => {
    render(<EditProfileModal user={user} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Profili Düzenle')).toBeInTheDocument()
    expect(screen.getByDisplayValue('ahmet')).toBeInTheDocument()
    expect(screen.getByDisplayValue('ahmet@b.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ahmet')).toBeInTheDocument()
  })

  describe('validation', () => {
    it('requires a username', async () => {
      render(<EditProfileModal user={user} onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.clear(labelInput('Kullanıcı Adı'))
      await userEvent.click(screen.getByText('Kaydet'))
      expect(toast.error).toHaveBeenCalledWith('Kullanıcı adı boş olamaz.')
    })

    it('requires an email', async () => {
      render(<EditProfileModal user={user} onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.clear(labelInput('E-posta'))
      await userEvent.click(screen.getByText('Kaydet'))
      expect(toast.error).toHaveBeenCalledWith('E-posta boş olamaz.')
    })
  })

  it('omits password from the payload when left empty', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    render(<EditProfileModal user={user} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('password')
  })

  it('includes password in the payload when provided', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    render(<EditProfileModal user={user} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.type(labelInput('Yeni Şifre (isteğe bağlı)'), 'yeniSifre1')
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => {
      expect(onSave.mock.calls[0][0]).toMatchObject({ password: 'yeniSifre1' })
    })
  })

  it('toasts success and closes on save', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    const onClose = vi.fn()
    render(<EditProfileModal user={user} onClose={onClose} onSave={onSave} />)
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Kullanıcı güncellendi.'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows backend field errors', async () => {
    const onSave = vi.fn().mockRejectedValue({ response: { data: { email: ['geçersiz'] } } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<EditProfileModal user={user} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('email'))
    })
  })

  it('shows a generic error without response data', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('network'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<EditProfileModal user={user} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Kullanıcı güncellenemedi.')
    })
  })

  it('defaults is_active to true when user has it undefined', () => {
    render(<EditProfileModal user={{ ...user, is_active: undefined }} onClose={vi.fn()} onSave={vi.fn()} />)
    const checkbox = screen.getByText('Aktif Kullanıcı').parentElement.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeChecked()
  })

  it('calls onClose from cancel', async () => {
    const onClose = vi.fn()
    render(<EditProfileModal user={user} onClose={onClose} onSave={vi.fn()} />)
    await userEvent.click(screen.getByText('İptal'))
    expect(onClose).toHaveBeenCalled()
  })
})
