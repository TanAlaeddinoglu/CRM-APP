import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTags, getTag, createTag, updateTag, deleteTag } from '../../src/services/tag.js'

vi.mock('../../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../../src/services/api.js'

beforeEach(() => vi.clearAllMocks())

describe('tag service', () => {
  it('getTags() GETs /customers/tag/', async () => {
    api.get.mockResolvedValue({ data: [] })
    await getTags()
    expect(api.get).toHaveBeenCalledWith('/customers/tag/')
  })

  it('getTag() GETs /customers/tag/:id/', async () => {
    api.get.mockResolvedValue({ data: { id: 7 } })
    await getTag(7)
    expect(api.get).toHaveBeenCalledWith('/customers/tag/7/')
  })

  it('createTag() POSTs to /customers/tag/', async () => {
    api.post.mockResolvedValue({ data: { id: 3 } })
    await createTag({ tag_name: 'New' })
    expect(api.post).toHaveBeenCalledWith('/customers/tag/', { tag_name: 'New' })
  })

  it('updateTag() PATCHes /customers/tag/:id/', async () => {
    api.patch.mockResolvedValue({ data: { id: 3 } })
    await updateTag(3, { tag_name: 'Updated' })
    expect(api.patch).toHaveBeenCalledWith('/customers/tag/3/', { tag_name: 'Updated' })
  })

  it('deleteTag() DELETEs /customers/tag/:id/', async () => {
    api.delete.mockResolvedValue({})
    await deleteTag(3)
    expect(api.delete).toHaveBeenCalledWith('/customers/tag/3/')
  })

  it('propagates errors', async () => {
    api.get.mockRejectedValue(new Error('Network'))
    await expect(getTags()).rejects.toThrow('Network')
  })
})
