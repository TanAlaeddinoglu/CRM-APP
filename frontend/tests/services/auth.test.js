import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, logout, me, getCSRF } from '../../src/services/auth.js'

vi.mock('../../src/services/api.js', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock('js-cookie', () => ({
  default: { get: vi.fn(() => 'test-csrf-token') },
}))

import { api } from '../../src/services/api.js'
import Cookies from 'js-cookie'

beforeEach(() => { vi.clearAllMocks() })

describe('auth service', () => {
  describe('login()', () => {
    it('POSTs to /accounts/login/ with credentials and CSRF header', async () => {
      api.post.mockResolvedValue({ data: { detail: 'ok' } })
      const payload = { username: 'user', password: 'pass' }
      await login(payload)
      expect(api.post).toHaveBeenCalledWith(
        '/accounts/login/',
        payload,
        expect.objectContaining({
          withCredentials: true,
          headers: expect.objectContaining({ 'X-CSRFToken': 'test-csrf-token' }),
        })
      )
    })

    it('propagates error on failed login', async () => {
      api.post.mockRejectedValue(new Error('401'))
      await expect(login({ username: 'x', password: 'y' })).rejects.toThrow('401')
    })
  })

  describe('logout()', () => {
    it('POSTs to /accounts/logout/ with credentials and CSRF header', async () => {
      api.post.mockResolvedValue({})
      await logout()
      expect(api.post).toHaveBeenCalledWith(
        '/accounts/logout/',
        null,
        expect.objectContaining({
          withCredentials: true,
          headers: expect.objectContaining({ 'X-CSRFToken': 'test-csrf-token' }),
        })
      )
    })
  })

  describe('me()', () => {
    it('GETs /accounts/profile/', async () => {
      api.get.mockResolvedValue({ data: { id: 1, username: 'user' } })
      const res = await me()
      expect(api.get).toHaveBeenCalledWith('/accounts/profile/')
      expect(res.data.username).toBe('user')
    })
  })

  describe('getCSRF()', () => {
    it('GETs /accounts/csrf/ with credentials', async () => {
      api.get.mockResolvedValue({})
      await getCSRF()
      expect(api.get).toHaveBeenCalledWith('/accounts/csrf/', { withCredentials: true })
    })
  })
})
