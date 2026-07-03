import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddUserModal from '../../src/components/AddUserModal.jsx'

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from 'react-hot-toast'

const labelInput = (labelText) =>
  screen.getByText(labelText).parentElement.querySelector('input, select')

beforeEach(() => vi.clearAllMocks())

async function fillRequired() {
  await userEvent.type(labelInput('Kullanıcı Adı'), 'yeni')
  await userEvent.type(labelInput('E-posta'), 'yeni@b.com')
  await userEvent.type(labelInput('Şifre'), 'gizli123')
}

describe('AddUserModal', () => {
  it('renders title, subtitle and fields', () => {
    render(<AddUserModal onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Yeni Kullanıcı Ekle')).toBeInTheDocument()
    expect(screen.getByText('Kullanıcı Adı')).toBeInTheDocument()
    expect(screen.getByText('Aktif Kullanıcı')).toBeInTheDocument()
  })

  // Note: username/password inputs have the native HTML `required` attribute, so a
  // normal click-submit is blocked by the browser before the JS validation runs.
  // We submit the form directly to exercise the JS-level validation branches.
  describe('validation (JS-level, via direct form submit)', () => {
    const submitForm = () => fireEvent.submit(document.querySelector('form'))

    it('requires a username', async () => {
      render(<AddUserModal onClose={vi.fn()} onSave={vi.fn()} />)
      submitForm()
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Kullanıcı adı zorunludur.'))
    })

    it('requires an email', async () => {
      render(<AddUserModal onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.type(labelInput('Kullanıcı Adı'), 'yeni')
      submitForm()
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('E-posta zorunludur.'))
    })

    it('requires a password', async () => {
      render(<AddUserModal onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.type(labelInput('Kullanıcı Adı'), 'yeni')
      await userEvent.type(labelInput('E-posta'), 'yeni@b.com')
      submitForm()
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Şifre zorunludur.'))
    })
  })

  it('saves, toasts success and closes on valid submit', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    const onClose = vi.fn()
    render(<AddUserModal onClose={onClose} onSave={onSave} />)
    await fillRequired()
    await userEvent.click(screen.getByText('Kullanıcı Ekle'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'yeni', email: 'yeni@b.com', password: 'gizli123', role: 'USER', is_active: true })
      )
    })
    expect(toast.success).toHaveBeenCalledWith('Kullanıcı oluşturuldu.')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows backend field errors', async () => {
    const onSave = vi.fn().mockRejectedValue({ response: { data: { username: ['zaten var'] } } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<AddUserModal onClose={vi.fn()} onSave={onSave} />)
    await fillRequired()
    await userEvent.click(screen.getByText('Kullanıcı Ekle'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('username'))
    })
  })

  it('shows a generic error when there is no response data', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('network'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<AddUserModal onClose={vi.fn()} onSave={onSave} />)
    await fillRequired()
    await userEvent.click(screen.getByText('Kullanıcı Ekle'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Kullanıcı oluşturulamadı.')
    })
  })

  it('updates role and active checkbox state', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    render(<AddUserModal onClose={vi.fn()} onSave={onSave} />)
    await fillRequired()
    await userEvent.selectOptions(labelInput('Rol'), 'ADMIN')
    await userEvent.click(screen.getByText('Aktif Kullanıcı').parentElement.querySelector('input[type="checkbox"]'))
    await userEvent.click(screen.getByText('Kullanıcı Ekle'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN', is_active: false })
      )
    })
  })

  it('calls onClose from cancel', async () => {
    const onClose = vi.fn()
    render(<AddUserModal onClose={onClose} onSave={vi.fn()} />)
    await userEvent.click(screen.getByText('İptal'))
    expect(onClose).toHaveBeenCalled()
  })
})
