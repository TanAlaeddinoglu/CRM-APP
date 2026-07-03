import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProductList from '../../src/components/ProductList.jsx'

vi.mock('../../src/services/product.js', () => ({
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
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

import { getProducts, createProduct, updateProduct } from '../../src/services/product.js'
import { useAuth } from '../../src/context/AuthContext.jsx'

const products = [
  { id: 1, name: 'Beta Paket', description: 'açıklamalı', slug: 'beta', created_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Alfa Paket', description: '', slug: 'alfa', created_at: '2024-02-01T00:00:00Z' },
]

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.mockReturnValue({ user: { role: 'ADMIN', email: 'a@b.com' } })
  getProducts.mockResolvedValue({ data: products })
  createProduct.mockResolvedValue({})
  updateProduct.mockResolvedValue({})
})

describe('ProductList', () => {
  it('loads products on mount and renders rows', async () => {
    render(<ProductList />)
    await waitFor(() => expect(getProducts).toHaveBeenCalled())
    expect(await screen.findByText('Beta Paket')).toBeInTheDocument()
    expect(screen.getByText('Alfa Paket')).toBeInTheDocument()
  })

  it('shows the product count', async () => {
    render(<ProductList />)
    expect(await screen.findByText('2 ürün')).toBeInTheDocument()
  })

  it('filters by search term (name or description)', async () => {
    render(<ProductList />)
    await screen.findByText('Beta Paket')
    await userEvent.type(screen.getByPlaceholderText('Ürün ara...'), 'alfa')
    await waitFor(() => expect(screen.queryByText('Beta Paket')).not.toBeInTheDocument())
    expect(screen.getByText('Alfa Paket')).toBeInTheDocument()
  })

  it('filters to only products with a description', async () => {
    render(<ProductList />)
    await screen.findByText('Beta Paket')
    await userEvent.click(screen.getByText('Açıklaması olanlar'))
    await waitFor(() => expect(screen.queryByText('Alfa Paket')).not.toBeInTheDocument())
    expect(screen.getByText('Beta Paket')).toBeInTheDocument()
  })

  it('sorts by name when the header is clicked', async () => {
    render(<ProductList />)
    await screen.findByText('Beta Paket')
    await userEvent.click(screen.getByText(/^Ad/))
    const rows = screen.getAllByRole('row').slice(1) // skip header
    expect(within(rows[0]).getByText('Alfa Paket')).toBeInTheDocument()
  })

  it('shows the empty state when no products match', async () => {
    getProducts.mockResolvedValue({ data: [] })
    render(<ProductList />)
    expect(await screen.findByText('Ürün bulunamadı.')).toBeInTheDocument()
  })

  describe('admin-only UI', () => {
    it('shows export, add and edit controls for admins', async () => {
      render(<ProductList />)
      await screen.findByText('Beta Paket')
      expect(screen.getByTestId('export-button')).toBeInTheDocument()
      expect(screen.getByLabelText('Ürün Ekle')).toBeInTheDocument()
      expect(screen.getAllByLabelText('Düzenle').length).toBe(2)
    })

    it('hides those controls for non-admins', async () => {
      useAuth.mockReturnValue({ user: { role: 'USER' } })
      render(<ProductList />)
      await screen.findByText('Beta Paket')
      expect(screen.queryByTestId('export-button')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Ürün Ekle')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Düzenle')).not.toBeInTheDocument()
    })
  })

  describe('create flow', () => {
    it('opens the add modal, submits and calls createProduct', async () => {
      render(<ProductList />)
      await screen.findByText('Beta Paket')
      await userEvent.click(screen.getByLabelText('Ürün Ekle'))
      expect(screen.getByText('Ürün Ekle', { selector: 'h2' })).toBeInTheDocument()
      await userEvent.type(screen.getByPlaceholderText('Ürün adı'), 'Gama Paket')
      await userEvent.click(screen.getByText('Ekle'))
      await waitFor(() => {
        expect(createProduct).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Gama Paket' })
        )
      })
      expect(getProducts).toHaveBeenCalledTimes(2) // initial + reload
    })
  })

  describe('edit flow', () => {
    it('opens the edit modal, submits and calls updateProduct', async () => {
      render(<ProductList />)
      await screen.findByText('Beta Paket')
      await userEvent.click(screen.getAllByLabelText('Düzenle')[0])
      expect(screen.getByText('Ürün Düzenle')).toBeInTheDocument()
      await userEvent.click(screen.getByText('Kaydet'))
      await waitFor(() => {
        expect(updateProduct).toHaveBeenCalled()
      })
    })
  })
})
