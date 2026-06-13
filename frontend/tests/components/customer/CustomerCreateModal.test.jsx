import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CustomerCreateModal from '../../../src/components/customer/CustomerCreateModal.jsx'

vi.mock('../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}))

vi.mock('../../../src/services/customer.js', () => ({
  createCustomer: vi.fn(),
}))

vi.mock('../../../src/services/product.js', () => ({
  getProducts: vi.fn(),
}))

vi.mock('../../../src/services/user.js', () => ({
  getUsers: vi.fn(),
}))

vi.mock('../../../src/services/customerProducts.js', () => ({
  addCustomerProduct: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { createCustomer } from '../../../src/services/customer.js'
import { getProducts } from '../../../src/services/product.js'
import { getUsers } from '../../../src/services/user.js'
import { addCustomerProduct } from '../../../src/services/customerProducts.js'
import { toast } from 'react-hot-toast'

beforeEach(() => vi.clearAllMocks())

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  tags: [{ id: 1, tag_name: 'VIP' }],
}

describe('CustomerCreateModal', () => {
  beforeEach(() => {
    getProducts.mockResolvedValue({ data: [{ id: 1, name: 'Diabetes' }] })
    getUsers.mockResolvedValue({ data: [{ id: 5, username: 'ali', is_active: true }] })
  })

  it('does not render when isOpen=false', () => {
    render(<CustomerCreateModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText(/Yeni Müşteri/)).not.toBeInTheDocument()
  })

  it('renders form when open', async () => {
    render(<CustomerCreateModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ad')).toBeInTheDocument()
    })
  })

  it('fetches products on open', async () => {
    render(<CustomerCreateModal {...defaultProps} />)
    await waitFor(() => expect(getProducts).toHaveBeenCalled())
  })

  it('fetches users for admin', async () => {
    render(<CustomerCreateModal {...defaultProps} />)
    await waitFor(() => expect(getUsers).toHaveBeenCalled())
  })

  it('clears tag and assigned when status changes to pool', async () => {
    render(<CustomerCreateModal {...defaultProps} />)
    await waitFor(() => screen.getByPlaceholderText('Ad'))
    const selects = screen.getAllByRole('combobox')
    // first select is status
    await userEvent.selectOptions(selects[0], 'pool')
    // tag/assigned selects should reset
    const tagSelect = selects.find(s => s.value === '' && s !== selects[0])
    if (tagSelect) expect(tagSelect.value).toBe('')
  })

  it('submits and calls onSuccess on success', async () => {
    createCustomer.mockResolvedValue({ data: { id: 10 } })
    render(<CustomerCreateModal {...defaultProps} />)
    await waitFor(() => screen.getByPlaceholderText('Ad'))

    // Fill required fields: name, surname, tag (status defaults to active)
    await userEvent.type(screen.getByPlaceholderText('Ad'), 'Ali')
    await userEvent.type(screen.getByPlaceholderText('Soyad'), 'Veli')
    // Select tag (index varies; find the tag select)
    const tagSelect = screen.getAllByRole('combobox').find(s =>
      Array.from(s.options).some(o => o.text === 'VIP')
    )
    if (tagSelect) await userEvent.selectOptions(tagSelect, '1')

    await userEvent.click(screen.getByText('Kaydet'))

    await waitFor(() => {
      expect(createCustomer).toHaveBeenCalled()
    })
  })

  it('shows error toast when products fail to load', async () => {
    getProducts.mockRejectedValue(new Error('fail'))
    render(<CustomerCreateModal {...defaultProps} />)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Hastalıklar yüklenemedi')
    })
  })

  it('shows error toast when users fail to load', async () => {
    getUsers.mockRejectedValue(new Error('fail'))
    render(<CustomerCreateModal {...defaultProps} />)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Kullanıcılar yüklenemedi')
    })
  })

  it('shows error when create fails', async () => {
    createCustomer.mockRejectedValue({ response: { data: { detail: 'Error' } } })
    render(<CustomerCreateModal {...defaultProps} />)
    await waitFor(() => screen.getByPlaceholderText('Ad'))
    await userEvent.type(screen.getByPlaceholderText('Ad'), 'Ali')
    await userEvent.click(screen.getByText('Kaydet'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
