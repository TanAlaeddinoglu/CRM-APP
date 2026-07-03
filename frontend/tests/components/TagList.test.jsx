import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TagList from '../../src/components/TagList.jsx'

vi.mock('../../src/services/tag.js', () => ({
  getTags: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
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

import { getTags, createTag, updateTag, deleteTag } from '../../src/services/tag.js'
import { useAuth } from '../../src/context/AuthContext.jsx'
import { toast } from 'react-hot-toast'

const tags = [
  { id: 1, tag_name: 'VIP', slug: 'vip', description: 'önemli', color: '#FF0000' },
  { id: 2, tag_name: 'Soğuk', slug: 'soguk', description: '', color: '#0000FF' },
]

const labelInput = (labelText) =>
  screen.getByText(labelText).parentElement.querySelector('input, select, textarea')

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.mockReturnValue({ user: { role: 'ADMIN', email: 'a@b.com' } })
  getTags.mockResolvedValue({ data: tags })
  createTag.mockResolvedValue({})
  updateTag.mockResolvedValue({})
  deleteTag.mockResolvedValue({})
})

describe('TagList', () => {
  it('loads tags on mount and renders rows', async () => {
    render(<TagList />)
    await waitFor(() => expect(getTags).toHaveBeenCalled())
    expect(await screen.findByText('VIP')).toBeInTheDocument()
    expect(screen.getByText('Soğuk')).toBeInTheDocument()
  })

  it('shows the tag count', async () => {
    render(<TagList />)
    expect(await screen.findByText('2 etiket')).toBeInTheDocument()
  })

  it('filters by search term', async () => {
    render(<TagList />)
    await screen.findByText('VIP')
    await userEvent.type(screen.getByPlaceholderText('Etiket ara...'), 'soğuk')
    await waitFor(() => expect(screen.queryByText('VIP')).not.toBeInTheDocument())
  })

  it('filters to only tags with a description', async () => {
    render(<TagList />)
    await screen.findByText('VIP')
    await userEvent.click(screen.getByText('Açıklaması olanlar'))
    await waitFor(() => expect(screen.queryByText('Soğuk')).not.toBeInTheDocument())
  })

  it('sorts by name', async () => {
    render(<TagList />)
    await screen.findByText('VIP')
    await userEvent.click(screen.getByText(/^Ad/))
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Soğuk')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    getTags.mockResolvedValue({ data: [] })
    render(<TagList />)
    expect(await screen.findByText('Etiket bulunamadı.')).toBeInTheDocument()
  })

  it('shows an error toast when loading fails', async () => {
    getTags.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<TagList />)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Etiketler yüklenirken bir hata oluştu.')
    })
  })

  describe('admin-only UI', () => {
    it('hides controls for non-admins', async () => {
      useAuth.mockReturnValue({ user: { role: 'USER' } })
      render(<TagList />)
      await screen.findByText('VIP')
      expect(screen.queryByTestId('export-button')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Etiket Ekle')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Düzenle')).not.toBeInTheDocument()
    })
  })

  describe('create flow', () => {
    it('creates a tag and shows success toast', async () => {
      render(<TagList />)
      await screen.findByText('VIP')
      await userEvent.click(screen.getByLabelText('Etiket Ekle'))
      const modal = within(screen.getByText('Yeni Etiket Ekle').closest('.modal-box'))
      await userEvent.type(modal.getByText('Etiket Adı').parentElement.querySelector('input'), 'Yeni')
      await userEvent.selectOptions(modal.getByText('Renk').parentElement.querySelector('select'), '#008000')
      await userEvent.type(modal.getByText('Açıklama').parentElement.querySelector('textarea'), 'desc')
      await userEvent.click(screen.getByText('Kaydet'))
      await waitFor(() => expect(createTag).toHaveBeenCalled())
      expect(toast.success).toHaveBeenCalledWith('Etiket başarıyla oluşturuldu.')
    })
  })

  describe('edit flow', () => {
    it('updates a tag and shows success toast', async () => {
      render(<TagList />)
      await screen.findByText('VIP')
      await userEvent.click(screen.getAllByLabelText('Düzenle')[0])
      expect(screen.getByText('Etiket Düzenle')).toBeInTheDocument()
      await userEvent.click(screen.getByText('Kaydet'))
      await waitFor(() => expect(updateTag).toHaveBeenCalled())
      expect(toast.success).toHaveBeenCalledWith('Etiket güncellendi.')
    })
  })

  describe('delete flow', () => {
    it('deletes a tag through the edit modal confirm dialog', async () => {
      render(<TagList />)
      await screen.findByText('VIP')
      await userEvent.click(screen.getAllByLabelText('Düzenle')[0])
      await userEvent.click(screen.getByText('Sil'))
      await userEvent.click(screen.getByText('Evet, Sil'))
      await waitFor(() => expect(deleteTag).toHaveBeenCalledWith(1))
      expect(toast.success).toHaveBeenCalledWith('Etiket silindi.')
    })
  })
})
