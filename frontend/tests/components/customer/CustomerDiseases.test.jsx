import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CustomerDiseases from '../../../src/components/customer/CustomerDiseases.jsx'

vi.mock('../../../src/services/product.js', () => ({
  getProducts: vi.fn(),
}))

vi.mock('../../../src/services/customerProducts.js', () => ({
  addCustomerProduct: vi.fn(),
  deleteCustomerProduct: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { getProducts } from '../../../src/services/product.js'
import { addCustomerProduct, deleteCustomerProduct } from '../../../src/services/customerProducts.js'
import { toast } from 'react-hot-toast'

beforeEach(() => vi.clearAllMocks())

const allProducts = [
  { id: 1, name: 'Diabetes' },
  { id: 2, name: 'Hypertension' },
  { id: 3, name: 'Asthma' },
]

const customerProducts = [
  { id: 100, product_id_read: 1 },
]

describe('CustomerDiseases', () => {
  it('loads and shows all available products on edit', async () => {
    getProducts.mockResolvedValue({ data: allProducts })
    render(<CustomerDiseases customerId={5} customerProducts={customerProducts} onReload={vi.fn()} />)
    // click edit button
    const editBtn = await screen.findByRole('button', { name: /düzenle/i })
    await userEvent.click(editBtn)
    await waitFor(() => {
      expect(screen.getByText('Diabetes')).toBeInTheDocument()
      expect(screen.getByText('Hypertension')).toBeInTheDocument()
    })
  })

  it('shows error toast when products cannot be loaded', async () => {
    getProducts.mockRejectedValue(new Error('fail'))
    render(<CustomerDiseases customerId={5} customerProducts={[]} onReload={vi.fn()} />)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Hastalıklar yüklenemedi')
    })
  })

  it('pre-checks existing customer products when editing', async () => {
    getProducts.mockResolvedValue({ data: allProducts })
    render(<CustomerDiseases customerId={5} customerProducts={customerProducts} onReload={vi.fn()} />)
    const editBtn = await screen.findByRole('button', { name: /düzenle/i })
    await userEvent.click(editBtn)
    await waitFor(() => {
      const diabetesCheckbox = screen.getByRole('checkbox', { name: /Diabetes/i })
      expect(diabetesCheckbox).toBeChecked()
    })
  })

  it('unchecked products can be toggled', async () => {
    getProducts.mockResolvedValue({ data: allProducts })
    render(<CustomerDiseases customerId={5} customerProducts={customerProducts} onReload={vi.fn()} />)
    const editBtn = await screen.findByRole('button', { name: /düzenle/i })
    await userEvent.click(editBtn)
    await waitFor(() => screen.getByText('Hypertension'))
    const hypertensionBox = screen.getByRole('checkbox', { name: /Hypertension/i })
    expect(hypertensionBox).not.toBeChecked()
    await userEvent.click(hypertensionBox)
    expect(hypertensionBox).toBeChecked()
  })

  it('calls add and delete on save (diff-based)', async () => {
    getProducts.mockResolvedValue({ data: allProducts })
    addCustomerProduct.mockResolvedValue({})
    deleteCustomerProduct.mockResolvedValue({})
    const onReload = vi.fn().mockResolvedValue(undefined)

    render(<CustomerDiseases customerId={5} customerProducts={customerProducts} onReload={onReload} />)
    const editBtn = await screen.findByRole('button', { name: /düzenle/i })
    await userEvent.click(editBtn)
    await waitFor(() => screen.getByText('Hypertension'))

    // add hypertension, keep diabetes (already checked)
    await userEvent.click(screen.getByRole('checkbox', { name: /Hypertension/i }))

    // click save button (opens confirm)
    await userEvent.click(screen.getByRole('button', { name: /kaydet/i }))
    // confirm dialog
    await userEvent.click(screen.getByRole('button', { name: /evet|onayla|güncelle/i }))

    await waitFor(() => {
      expect(addCustomerProduct).toHaveBeenCalledWith({ customer_id: 5, product_id: 2 })
      expect(toast.success).toHaveBeenCalledWith('Hastalıklar güncellendi')
    })
  })

  it('shows error toast on save failure (bug #14 — no rollback)', async () => {
    getProducts.mockResolvedValue({ data: allProducts })
    addCustomerProduct.mockRejectedValue(new Error('fail'))
    deleteCustomerProduct.mockRejectedValue(new Error('fail'))

    render(<CustomerDiseases customerId={5} customerProducts={customerProducts} onReload={vi.fn()} />)
    const editBtn = await screen.findByRole('button', { name: /düzenle/i })
    await userEvent.click(editBtn)
    await waitFor(() => screen.getByText('Hypertension'))

    await userEvent.click(screen.getByRole('checkbox', { name: /Hypertension/i }))
    await userEvent.click(screen.getByRole('button', { name: /kaydet/i }))
    await userEvent.click(screen.getByRole('button', { name: /evet|onayla|güncelle/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Hastalıklar güncellenemedi')
    })
  })
})
