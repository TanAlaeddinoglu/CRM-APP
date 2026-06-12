import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProducts, createProduct, updateProduct } from '../../src/services/product.js'

vi.mock('../../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import { api } from '../../src/services/api.js'

beforeEach(() => vi.clearAllMocks())

describe('product service', () => {
  it('getProducts() GETs /products/', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    await getProducts()
    expect(api.get).toHaveBeenCalledWith('/products/')
  })

  it('createProduct() POSTs to /products/', async () => {
    api.post.mockResolvedValue({ data: { id: 1 } })
    await createProduct({ name: 'TestProd' })
    expect(api.post).toHaveBeenCalledWith('/products/', { name: 'TestProd' })
  })

  it('updateProduct() PATCHes /products/:id/', async () => {
    api.patch.mockResolvedValue({ data: { id: 2 } })
    await updateProduct(2, { name: 'Updated' })
    expect(api.patch).toHaveBeenCalledWith('/products/2/', { name: 'Updated' })
  })

  it('updateProduct() propagates errors', async () => {
    api.patch.mockRejectedValue(new Error('500'))
    await expect(updateProduct(1, {})).rejects.toThrow('500')
  })
})
