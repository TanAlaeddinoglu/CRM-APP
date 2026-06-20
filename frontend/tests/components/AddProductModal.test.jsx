import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddProductModal from '../../src/components/AddProductModal.jsx'

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from 'react-hot-toast'

beforeEach(() => vi.clearAllMocks())

describe('AddProductModal', () => {
  it('renders title and fields', () => {
    render(<AddProductModal onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Ürün Ekle')).toBeInTheDocument()
    expect(screen.getByText('Ürün Adı')).toBeInTheDocument()
    expect(screen.getByText('Açıklama')).toBeInTheDocument()
  })

  it('warns and does not save when name is empty', async () => {
    const onSave = vi.fn()
    render(<AddProductModal onClose={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByText('Ekle'))
    expect(toast.error).toHaveBeenCalledWith('Ürün adı zorunludur.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves and shows success toast on valid submit', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    render(<AddProductModal onClose={vi.fn()} onSave={onSave} />)
    await userEvent.type(screen.getByPlaceholderText('Ürün adı'), 'Paket A')
    await userEvent.type(screen.getByPlaceholderText('Kısa açıklama (isteğe bağlı)'), 'açıklama')
    await userEvent.click(screen.getByText('Ekle'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ name: 'Paket A', description: 'açıklama' })
    })
    expect(toast.success).toHaveBeenCalledWith('Ürün oluşturuldu!')
  })

  it('shows error toast when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fail'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<AddProductModal onClose={vi.fn()} onSave={onSave} />)
    await userEvent.type(screen.getByPlaceholderText('Ürün adı'), 'Paket A')
    await userEvent.click(screen.getByText('Ekle'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Ürün oluşturulamadı.')
    })
  })

  it('calls onClose from cancel', async () => {
    const onClose = vi.fn()
    render(<AddProductModal onClose={onClose} onSave={vi.fn()} />)
    await userEvent.click(screen.getByText('İptal'))
    expect(onClose).toHaveBeenCalled()
  })
})
