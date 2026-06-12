import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCustomerProducts, getAllProducts, addCustomerProduct, deleteCustomerProduct,
} from '../../src/services/customerProducts.js'

vi.mock('../../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

import { api } from '../../src/services/api.js'

beforeEach(() => vi.clearAllMocks())

describe('customerProducts service', () => {
  it('getCustomerProducts() GETs with customer filter', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    await getCustomerProducts(42)
    expect(api.get).toHaveBeenCalledWith('/products/customer-products/', {
      params: { customer: 42 },
    })
  })

  it('getAllProducts() GETs without filter', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    await getAllProducts()
    expect(api.get).toHaveBeenCalledWith('/products/customer-products/')
  })

  it('addCustomerProduct() POSTs to /products/customer-products/', async () => {
    api.post.mockResolvedValue({ data: { id: 1 } })
    const data = { customer: 42, product: 7 }
    await addCustomerProduct(data)
    expect(api.post).toHaveBeenCalledWith('/products/customer-products/', data)
  })

  it('deleteCustomerProduct() DELETEs /products/customer-products/:id/', async () => {
    api.delete.mockResolvedValue({})
    await deleteCustomerProduct(99)
    expect(api.delete).toHaveBeenCalledWith('/products/customer-products/99/')
  })

  it('propagates errors', async () => {
    api.get.mockRejectedValue(new Error('403'))
    await expect(getCustomerProducts(1)).rejects.toThrow('403')
  })
})
