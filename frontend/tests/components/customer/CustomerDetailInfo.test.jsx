import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CustomerDetailInfo from '../../../src/components/customer/CustomerDetailInfo.jsx'

vi.mock('../../../src/services/tag.js', () => ({
  getTags: vi.fn(),
}))

vi.mock('../../../src/services/user.js', () => ({
  getUsers: vi.fn(),
}))

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

import { getTags } from '../../../src/services/tag.js'
import { getUsers } from '../../../src/services/user.js'
import { getProducts } from '../../../src/services/product.js'
import { toast } from 'react-hot-toast'

const mockCustomer = {
  id: 1,
  customer_name: 'Ali',
  customer_surname: 'Veli',
  customer_email: 'ali@test.com',
  customer_phone: '5551234567',
  city: 'Istanbul',
  status: 'active',
  tag: 'VIP',
  assigned_to_id: 5,
}

const mockTags = [{ id: 1, tag_name: 'VIP' }, { id: 2, tag_name: 'Regular' }]
const mockUsers = [{ id: 5, username: 'admin_user' }]

beforeEach(() => {
  vi.clearAllMocks()
  getTags.mockResolvedValue({ data: mockTags })
  getUsers.mockResolvedValue({ data: mockUsers })
  getProducts.mockResolvedValue({ data: [] })
})

describe('CustomerDetailInfo', () => {
  it('renders customer name and surname', async () => {
    render(
      <CustomerDetailInfo customer={mockCustomer} isAdmin onSave={vi.fn()} onReload={vi.fn()} />
    )
    await waitFor(() => {
      expect(screen.getByText(/Ali/)).toBeInTheDocument()
    })
  })

  it('fetches tags on mount', async () => {
    render(<CustomerDetailInfo customer={mockCustomer} onSave={vi.fn()} onReload={vi.fn()} />)
    await waitFor(() => expect(getTags).toHaveBeenCalled())
  })

  it('fetches users for admin only', async () => {
    render(<CustomerDetailInfo customer={mockCustomer} isAdmin={false} onSave={vi.fn()} onReload={vi.fn()} />)
    await waitFor(() => expect(getTags).toHaveBeenCalled())
    expect(getUsers).not.toHaveBeenCalled()
  })

  it('fetches users when isAdmin=true', async () => {
    render(<CustomerDetailInfo customer={mockCustomer} isAdmin={true} onSave={vi.fn()} onReload={vi.fn()} />)
    await waitFor(() => expect(getUsers).toHaveBeenCalled())
  })

  it('shows error toast when tags fail to load', async () => {
    getTags.mockRejectedValue(new Error('fail'))
    render(<CustomerDetailInfo customer={mockCustomer} onSave={vi.fn()} onReload={vi.fn()} />)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Tagler yüklenemedi')
    })
  })

  it('shows error toast when users fail to load', async () => {
    getUsers.mockRejectedValue(new Error('fail'))
    render(<CustomerDetailInfo customer={mockCustomer} isAdmin={true} onSave={vi.fn()} onReload={vi.fn()} />)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Kullanıcılar yüklenemedi')
    })
  })

  it('shows edit button', async () => {
    render(<CustomerDetailInfo customer={mockCustomer} onSave={vi.fn()} onReload={vi.fn()} />)
    await waitFor(() => expect(getTags).toHaveBeenCalled())
    const editBtn = screen.queryByTitle('Düzenle')
    expect(editBtn).toBeInTheDocument()
  })

  it('shows customer status', async () => {
    render(<CustomerDetailInfo customer={mockCustomer} onSave={vi.fn()} onReload={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/active/i)).toBeInTheDocument()
    })
  })

  it('shows customer phone', async () => {
    render(<CustomerDetailInfo customer={mockCustomer} onSave={vi.fn()} onReload={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/5551234567/)).toBeInTheDocument()
    })
  })
})
