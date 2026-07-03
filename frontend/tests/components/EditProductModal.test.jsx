import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditProductModal from '../../src/components/EditProductModal.jsx'

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from 'react-hot-toast'

const product = { id: 3, name: 'Paket A', description: 'eski açıklama' }

beforeEach(() => vi.clearAllMocks())

describe('EditProductModal', () => {
  it('pre-fills fields from the product prop', () => {
    render(<EditProductModal product={product} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Ürün Düzenle')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Paket A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('eski açıklama')).toBeInTheDocument()
  })

  it('handles a product with missing fields', () => {
    render(<EditProductModal product={{ id: 1 }} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Ürün Düzenle')).toBeInTheDocument()
  })

  it('warns when name is cleared', async () => {
    const onSave = vi.fn()
    render(<EditProductModal product={product} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.clear(screen.getByDisplayValue('Paket A'))
    await userEvent.click(screen.getByText('Kaydet'))
    expect(toast.error).toHaveBeenCalledWith('Ürün adı zorunludur.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves and shows success toast', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    render(<EditProductModal product={product} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ name: 'Paket A', description: 'eski açıklama' })
    })
    expect(toast.success).toHaveBeenCalledWith('Ürün güncellendi!')
  })

  it('shows error toast when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fail'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<EditProductModal product={product} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Ürün güncellenemedi.')
    })
  })

  it('calls onClose from cancel', async () => {
    const onClose = vi.fn()
    render(<EditProductModal product={product} onClose={onClose} onSave={vi.fn()} />)
    await userEvent.click(screen.getByText('İptal'))
    expect(onClose).toHaveBeenCalled()
  })
})
