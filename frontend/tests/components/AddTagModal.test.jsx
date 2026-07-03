import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddTagModal from '../../src/components/AddTagModal.jsx'

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from 'react-hot-toast'

beforeEach(() => vi.clearAllMocks())

const labelInput = (labelText) =>
  screen.getByText(labelText).parentElement.querySelector('input, select, textarea')

async function fillValid() {
  await userEvent.type(labelInput('Etiket Adı'), 'VIP Müşteri')
  await userEvent.selectOptions(labelInput('Renk'), '#FF0000')
  await userEvent.type(labelInput('Açıklama'), 'önemli')
}

describe('AddTagModal', () => {
  it('renders title and color options', () => {
    render(<AddTagModal onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Yeni Etiket Ekle')).toBeInTheDocument()
    expect(screen.getByText('Kırmızı')).toBeInTheDocument()
    expect(screen.getByText('Mor')).toBeInTheDocument()
  })

  it('auto-generates a slug from the tag name', async () => {
    render(<AddTagModal onClose={vi.fn()} onSave={vi.fn()} />)
    await userEvent.type(labelInput('Etiket Adı'), 'VIP Müşteri!')
    // lowercase, spaces→dash, special chars stripped → "vip-mteri" (ü removed)
    expect(labelInput('Slug').value).toBe('vip-mteri')
  })

  describe('validation', () => {
    it('requires a tag name', async () => {
      render(<AddTagModal onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.click(screen.getByText('Kaydet'))
      expect(toast.error).toHaveBeenCalledWith('Etiket adı zorunludur.')
    })

    it('requires a color', async () => {
      render(<AddTagModal onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.type(labelInput('Etiket Adı'), 'VIP')
      await userEvent.click(screen.getByText('Kaydet'))
      expect(toast.error).toHaveBeenCalledWith('Renk seçmelisiniz.')
    })

    it('requires a description', async () => {
      render(<AddTagModal onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.type(labelInput('Etiket Adı'), 'VIP')
      await userEvent.selectOptions(labelInput('Renk'), '#FF0000')
      await userEvent.click(screen.getByText('Kaydet'))
      expect(toast.error).toHaveBeenCalledWith('Açıklama zorunludur.')
    })

    it('requires a slug (when cleared after auto-fill)', async () => {
      render(<AddTagModal onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.type(labelInput('Etiket Adı'), 'VIP')
      await userEvent.clear(labelInput('Slug'))
      await userEvent.click(screen.getByText('Kaydet'))
      expect(toast.error).toHaveBeenCalledWith('Slug zorunludur.')
    })
  })

  it('calls onSave with the form when valid', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    render(<AddTagModal onClose={vi.fn()} onSave={onSave} />)
    await fillValid()
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ tag_name: 'VIP Müşteri', color: '#FF0000', description: 'önemli' })
      )
    })
  })

  it('calls onClose from cancel', async () => {
    const onClose = vi.fn()
    render(<AddTagModal onClose={onClose} onSave={vi.fn()} />)
    await userEvent.click(screen.getByText('İptal'))
    expect(onClose).toHaveBeenCalled()
  })
})
