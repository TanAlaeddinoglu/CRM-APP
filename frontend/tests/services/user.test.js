import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUsers, createUser, updateUser } from '../../src/services/user.js'

vi.mock('../../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import { api } from '../../src/services/api.js'

beforeEach(() => vi.clearAllMocks())

describe('user service', () => {
  it('getUsers() GETs /accounts/users/', async () => {
    api.get.mockResolvedValue({ data: { results: [] } })
    await getUsers()
    expect(api.get).toHaveBeenCalledWith('/accounts/users/')
  })

  it('createUser() POSTs to /accounts/users/ with data', async () => {
    api.post.mockResolvedValue({ data: { id: 5 } })
    const payload = { username: 'newuser', password: 'pass' }
    const res = await createUser(payload)
    expect(api.post).toHaveBeenCalledWith('/accounts/users/', payload)
    expect(res.data.id).toBe(5)
  })

  it('updateUser() PATCHes /accounts/users/:id/', async () => {
    api.patch.mockResolvedValue({ data: { id: 3 } })
    await updateUser(3, { email: 'new@example.com' })
    expect(api.patch).toHaveBeenCalledWith('/accounts/users/3/', { email: 'new@example.com' })
  })

  it('updateUser() propagates error', async () => {
    api.patch.mockRejectedValue(new Error('404'))
    await expect(updateUser(999, {})).rejects.toThrow('404')
  })
})
