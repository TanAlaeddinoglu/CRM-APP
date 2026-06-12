import { describe, it, expect } from 'vitest'
import { isAdmin, isUser } from '../../src/utils/roles.js'

describe('roles utils', () => {
  describe('isAdmin()', () => {
    it('returns true for user with role ADMIN', () => {
      expect(isAdmin({ role: 'ADMIN' })).toBe(true)
    })

    it('returns false for user with role USER', () => {
      expect(isAdmin({ role: 'USER' })).toBe(false)
    })

    it('returns false for user with no role', () => {
      expect(isAdmin({ role: undefined })).toBe(false)
    })

    it('returns false for null user', () => {
      expect(isAdmin(null)).toBe(false)
    })

    it('returns false for undefined user', () => {
      expect(isAdmin(undefined)).toBe(false)
    })

    it('is case-sensitive — "admin" is not ADMIN', () => {
      expect(isAdmin({ role: 'admin' })).toBe(false)
    })
  })

  describe('isUser()', () => {
    it('returns true for user with role USER', () => {
      expect(isUser({ role: 'USER' })).toBe(true)
    })

    it('returns false for user with role ADMIN', () => {
      expect(isUser({ role: 'ADMIN' })).toBe(false)
    })

    it('returns false for null user', () => {
      expect(isUser(null)).toBe(false)
    })

    it('returns false for undefined user', () => {
      expect(isUser(undefined)).toBe(false)
    })

    it('is case-sensitive — "user" is not USER', () => {
      expect(isUser({ role: 'user' })).toBe(false)
    })
  })
})
