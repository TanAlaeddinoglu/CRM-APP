import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCustomerById, getCustomers, getMyCustomers, createCustomer, updateCustomer,
  deleteCustomer, bulkUpdateCustomers, bulkUpsertCustomers,
  getCustomerNotes, createCustomerNote, updateCustomerNote,
  getCustomerTagHistory, getTags, setCustomerTag, updateCustomerTag,
  deleteCustomerTag, resolveTagId, checkExistingByPhones,
  getCustomerTagStats, getMyCustomerTagStats,
} from '../../src/services/customer.js'

vi.mock('../../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

// js-cookie needed by customer.js at module level
vi.mock('js-cookie', () => ({ default: { get: vi.fn(() => null) } }))

import { api } from '../../src/services/api.js'

beforeEach(() => vi.clearAllMocks())

describe('customer service', () => {
  describe('getCustomerById()', () => {
    it('uses admin endpoint when isAdmin=true', async () => {
      api.get.mockResolvedValue({ data: {} })
      await getCustomerById(5, true)
      expect(api.get).toHaveBeenCalledWith('/customers/5/')
    })

    it('uses me endpoint when isAdmin=false', async () => {
      api.get.mockResolvedValue({ data: {} })
      await getCustomerById(5, false)
      expect(api.get).toHaveBeenCalledWith('/customers/me/5/')
    })
  })

  describe('getCustomers() / getMyCustomers()', () => {
    it('getCustomers() GETs /customers/ with params', async () => {
      api.get.mockResolvedValue({ data: { results: [] } })
      await getCustomers({ search: 'ali' })
      expect(api.get).toHaveBeenCalledWith('/customers/', { params: { search: 'ali' } })
    })

    it('getMyCustomers() GETs /customers/me/', async () => {
      api.get.mockResolvedValue({ data: { results: [] } })
      await getMyCustomers({ page: 1 })
      expect(api.get).toHaveBeenCalledWith('/customers/me/', { params: { page: 1 } })
    })
  })

  describe('createCustomer()', () => {
    it('POSTs to /customers/ for admin', async () => {
      api.post.mockResolvedValue({ data: { id: 1 } })
      await createCustomer({ name: 'Ali' }, true)
      expect(api.post).toHaveBeenCalledWith('/customers/', { name: 'Ali' })
    })

    it('POSTs to /customers/me/ for non-admin', async () => {
      api.post.mockResolvedValue({ data: { id: 2 } })
      await createCustomer({ name: 'Ali' }, false)
      expect(api.post).toHaveBeenCalledWith('/customers/me/', { name: 'Ali' })
    })
  })

  describe('updateCustomer()', () => {
    it('PATCHes /customers/:id/ for admin', async () => {
      api.patch.mockResolvedValue({ data: {} })
      await updateCustomer(5, { phone: '555' }, true)
      expect(api.patch).toHaveBeenCalledWith('/customers/5/', { phone: '555' })
    })

    it('PATCHes /customers/me/:id/ for non-admin (default)', async () => {
      api.patch.mockResolvedValue({ data: {} })
      await updateCustomer(5, { phone: '555' })
      expect(api.patch).toHaveBeenCalledWith('/customers/me/5/', { phone: '555' })
    })
  })

  describe('deleteCustomer()', () => {
    it('DELETEs /customers/:id/', async () => {
      api.delete.mockResolvedValue({})
      await deleteCustomer(3)
      expect(api.delete).toHaveBeenCalledWith('/customers/3/')
    })
  })

  describe('bulk operations', () => {
    it('bulkUpdateCustomers() PATCHes /customers/bulk/', async () => {
      api.patch.mockResolvedValue({ data: {} })
      await bulkUpdateCustomers([{ id: 1, status: 'active' }])
      expect(api.patch).toHaveBeenCalledWith('/customers/bulk/', {
        items: [{ id: 1, status: 'active' }],
      })
    })

    it('bulkUpsertCustomers() POSTs to /customers/bulk/upsert/', async () => {
      api.post.mockResolvedValue({ data: {} })
      await bulkUpsertCustomers([{ name: 'Ali', phone: '555' }])
      expect(api.post).toHaveBeenCalledWith('/customers/bulk/upsert/', {
        items: [{ name: 'Ali', phone: '555' }],
      })
    })
  })

  describe('notes', () => {
    it('getCustomerNotes() GETs with customerId filter', async () => {
      api.get.mockResolvedValue({ data: [] })
      await getCustomerNotes(10)
      expect(api.get).toHaveBeenCalledWith('/customers/notes/?customerId=10')
    })

    it('createCustomerNote() POSTs with customer_id and note', async () => {
      api.post.mockResolvedValue({ data: { id: 1 } })
      await createCustomerNote(10, 'Hello')
      expect(api.post).toHaveBeenCalledWith('/customers/notes/', {
        customer_id: 10,
        note: 'Hello',
      })
    })

    it('updateCustomerNote() PATCHes /:noteId/', async () => {
      api.patch.mockResolvedValue({ data: {} })
      await updateCustomerNote(3, 'Updated note')
      expect(api.patch).toHaveBeenCalledWith('/customers/notes/3/', { note: 'Updated note' })
    })
  })

  describe('tag history', () => {
    it('getCustomerTagHistory() GETs with customerId', async () => {
      api.get.mockResolvedValue({ data: [] })
      await getCustomerTagHistory(7)
      expect(api.get).toHaveBeenCalledWith('/customers/tag-history/?customerId=7')
    })
  })

  describe('tag stats', () => {
    it('getCustomerTagStats() GETs /customers/tag-stats/', async () => {
      api.get.mockResolvedValue({ data: [] })
      await getCustomerTagStats({ user: 1 })
      expect(api.get).toHaveBeenCalledWith('/customers/tag-stats/', { params: { user: 1 } })
    })

    it('getMyCustomerTagStats() GETs /customers/me/tag-stats/', async () => {
      api.get.mockResolvedValue({ data: [] })
      await getMyCustomerTagStats({})
      expect(api.get).toHaveBeenCalledWith('/customers/me/tag-stats/', { params: {} })
    })
  })

  describe('setCustomerTag()', () => {
    it('rejects null payload', async () => {
      await expect(setCustomerTag(null)).rejects.toThrow('missing payload')
    })

    it('rejects empty string', async () => {
      await expect(setCustomerTag('  ')).rejects.toThrow('empty tag name')
    })

    it('rejects dash string', async () => {
      await expect(setCustomerTag('-')).rejects.toThrow('empty tag name')
    })

    it('rejects numeric id (should not POST)', async () => {
      await expect(setCustomerTag(42)).rejects.toThrow('tag id given')
    })

    it('POSTs with string tag name', async () => {
      api.post.mockResolvedValue({ data: { id: 5 } })
      await setCustomerTag('NewTag')
      expect(api.post).toHaveBeenCalledWith('/customers/tag/', { name: 'NewTag' })
    })

    it('POSTs with object having name property', async () => {
      api.post.mockResolvedValue({ data: { id: 6 } })
      await setCustomerTag({ name: 'ObjTag' })
      expect(api.post).toHaveBeenCalledWith(
        '/customers/tag/',
        expect.objectContaining({ name: 'ObjTag' })
      )
    })

    it('uses tag/label/title as fallback name for objects', async () => {
      api.post.mockResolvedValue({ data: { id: 7 } })
      await setCustomerTag({ tag: 'FallbackTag' })
      expect(api.post).toHaveBeenCalledWith(
        '/customers/tag/',
        expect.objectContaining({ name: 'FallbackTag' })
      )
    })

    it('rejects object with empty name', async () => {
      await expect(setCustomerTag({ name: '' })).rejects.toThrow('empty tag name')
    })
  })

  describe('updateCustomerTag() / deleteCustomerTag()', () => {
    it('updateCustomerTag() PATCHes /customers/tag/:id/', async () => {
      api.patch.mockResolvedValue({ data: {} })
      await updateCustomerTag(3, { tag_name: 'New' })
      expect(api.patch).toHaveBeenCalledWith('/customers/tag/3/', { tag_name: 'New' })
    })

    it('deleteCustomerTag() DELETEs /customers/tag/:id/', async () => {
      api.delete.mockResolvedValue({})
      await deleteCustomerTag(3)
      expect(api.delete).toHaveBeenCalledWith('/customers/tag/3/')
    })
  })

  describe('resolveTagId()', () => {
    it('returns null for null input', async () => {
      expect(await resolveTagId(null)).toBeNull()
    })

    it('returns the number directly for numeric input', async () => {
      expect(await resolveTagId(7)).toBe(7)
    })

    it('returns id from object with id property', async () => {
      expect(await resolveTagId({ id: 12 })).toBe(12)
    })

    it('creates tag and returns id for string name', async () => {
      api.post.mockResolvedValue({ data: { id: 99 } })
      const id = await resolveTagId('NewTagName')
      expect(id).toBe(99)
    })

    it('returns null for dash string', async () => {
      expect(await resolveTagId('-')).toBeNull()
    })

    it('returns numeric value for digit-only string', async () => {
      expect(await resolveTagId('42')).toBe(42)
    })

    it('creates tag for object with name but no id', async () => {
      api.post.mockResolvedValue({ data: { id: 88 } })
      const id = await resolveTagId({ name: 'TagFromObj' })
      expect(id).toBe(88)
    })

    it('returns null for object with no id and no name', async () => {
      expect(await resolveTagId({})).toBeNull()
    })
  })

  describe('checkExistingByPhones()', () => {
    it('returns empty object for empty phones array', async () => {
      const result = await checkExistingByPhones([])
      expect(result).toEqual({})
    })

    it('returns empty object for null input', async () => {
      const result = await checkExistingByPhones(null)
      expect(result).toEqual({})
    })

    it('looks up phones and maps results by phone key', async () => {
      api.get.mockResolvedValue({
        data: {
          results: [{ id: 5, customer_phone: '5551234567', assigned_to: 'user1', tag: 'vip' }],
        },
      })
      const result = await checkExistingByPhones(['5551234567'])
      expect(result['5551234567']).toMatchObject({ id: 5 })
    })

    it('silently skips phones that return no exact match', async () => {
      api.get.mockResolvedValue({ data: { results: [] } })
      const result = await checkExistingByPhones(['0000000000'])
      expect(result).toEqual({})
    })

    it('silently swallows API errors (bug documented)', async () => {
      api.get.mockRejectedValue(new Error('Network'))
      const result = await checkExistingByPhones(['5551234567'])
      expect(result).toEqual({})
    })

    it('deduplicates duplicate phones before lookup', async () => {
      api.get.mockResolvedValue({ data: { results: [] } })
      await checkExistingByPhones(['555', '555', '555'])
      expect(api.get).toHaveBeenCalledTimes(1)
    })
  })
})
