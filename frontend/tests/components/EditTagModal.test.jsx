import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditTagModal from '../../src/components/EditTagModal.jsx'

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from 'react-hot-toast'

const tag = {
  id: 5,
  tag_name: 'VIP',
  slug: 'vip',
  color: '#FF0000',
  description: 'önemli müşteri',
}

const labelInput = (labelText) =>
  screen.getByText(labelText).parentElement.querySelector('input, select, textarea')

beforeEach(() => vi.clearAllMocks())

describe('EditTagModal', () => {
  it('pre-fills the form from the tag prop', () => {
    render(<EditTagModal tag={tag} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Etiket Düzenle')).toBeInTheDocument()
    expect(screen.getByDisplayValue('VIP')).toBeInTheDocument()
    expect(screen.getByDisplayValue('vip')).toBeInTheDocument()
    expect(screen.getByDisplayValue('önemli müşteri')).toBeInTheDocument()
  })

  describe('validation', () => {
    it('requires a tag name', async () => {
      render(<EditTagModal tag={tag} onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.clear(labelInput('Etiket Adı'))
      await userEvent.click(screen.getByText('Kaydet'))
      expect(toast.error).toHaveBeenCalledWith('Etiket adı zorunludur.')
    })

    it('requires a slug', async () => {
      render(<EditTagModal tag={tag} onClose={vi.fn()} onSave={vi.fn()} />)
      await userEvent.clear(labelInput('Slug'))
      await userEvent.click(screen.getByText('Kaydet'))
      expect(toast.error).toHaveBeenCalledWith('Slug zorunludur.')
    })
  })

  it('saves and shows success toast', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    render(<EditTagModal tag={tag} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('Etiket güncellendi!')
  })

  it('shows error toast when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fail'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<EditTagModal tag={tag} onClose={vi.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Etiket güncellenemedi.'))
  })

  describe('delete flow', () => {
    it('does not render the delete button without onDelete', () => {
      render(<EditTagModal tag={tag} onClose={vi.fn()} onSave={vi.fn()} />)
      expect(screen.queryByText('Sil')).not.toBeInTheDocument()
    })

    it('confirms and deletes', async () => {
      const onDelete = vi.fn()
      render(<EditTagModal tag={tag} onClose={vi.fn()} onSave={vi.fn()} onDelete={onDelete} />)
      await userEvent.click(screen.getByText('Sil'))
      expect(screen.getByText(/müşterilerinizin etiket bilgileri kaybolacaktır/)).toBeInTheDocument()
      await userEvent.click(screen.getByText('Evet, Sil'))
      expect(onDelete).toHaveBeenCalledWith(5)
    })

    it('cancels the delete confirmation', async () => {
      const onDelete = vi.fn()
      render(<EditTagModal tag={tag} onClose={vi.fn()} onSave={vi.fn()} onDelete={onDelete} />)
      await userEvent.click(screen.getByText('Sil'))
      await userEvent.click(screen.getByText('Vazgeç'))
      expect(screen.queryByText(/kaybolacaktır/)).not.toBeInTheDocument()
      expect(onDelete).not.toHaveBeenCalled()
    })
  })

  it('calls onClose from cancel', async () => {
    const onClose = vi.fn()
    render(<EditTagModal tag={tag} onClose={onClose} onSave={vi.fn()} />)
    await userEvent.click(screen.getByText('İptal'))
    expect(onClose).toHaveBeenCalled()
  })
})
