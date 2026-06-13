import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getEmailConfiguration, testEmailConfiguration, saveEmailConfiguration,
  resetEmailConfiguration, getEmailSettingsErrorMessage,
} from '../../src/services/emailSettings.js'

vi.mock('../../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import { api } from '../../src/services/api.js'

beforeEach(() => vi.clearAllMocks())

describe('emailSettings service', () => {
  it('getEmailConfiguration() GETs /notifications/email-settings/', async () => {
    api.get.mockResolvedValue({ data: {} })
    await getEmailConfiguration()
    expect(api.get).toHaveBeenCalledWith('/notifications/email-settings/')
  })

  it('testEmailConfiguration() POSTs to /notifications/email-settings/test/', async () => {
    api.post.mockResolvedValue({ data: { session_id: 'abc' } })
    const config = { host: 'smtp.example.com' }
    await testEmailConfiguration(config)
    expect(api.post).toHaveBeenCalledWith('/notifications/email-settings/test/', config)
  })

  it('saveEmailConfiguration() PUTs to /notifications/email-settings/', async () => {
    api.put.mockResolvedValue({ data: {} })
    const config = { host: 'smtp.example.com', port: 587 }
    await saveEmailConfiguration(config)
    expect(api.put).toHaveBeenCalledWith('/notifications/email-settings/', config)
  })

  it('resetEmailConfiguration() DELETEs /notifications/email-settings/', async () => {
    api.delete.mockResolvedValue({})
    await resetEmailConfiguration()
    expect(api.delete).toHaveBeenCalledWith('/notifications/email-settings/')
  })

  describe('getEmailSettingsErrorMessage()', () => {
    it('returns Turkish message for "load" action', () => {
      expect(getEmailSettingsErrorMessage('load')).toBe('Mail ayarları yüklenemedi.')
    })

    it('returns Turkish message for "test" action', () => {
      expect(getEmailSettingsErrorMessage('test')).toContain('Mail ayarları test edilemedi')
    })

    it('returns Turkish message for "save" action', () => {
      expect(getEmailSettingsErrorMessage('save')).toContain('Mail ayarları kaydedilemedi')
    })

    it('returns Turkish message for "reset" action', () => {
      expect(getEmailSettingsErrorMessage('reset')).toBe('Mail ayarları sıfırlanamadı.')
    })

    it('returns fallback for unknown action', () => {
      expect(getEmailSettingsErrorMessage('unknown')).toBe('Bir hata oluştu.')
    })

    it('returns fallback for undefined action', () => {
      expect(getEmailSettingsErrorMessage(undefined)).toBe('Bir hata oluştu.')
    })
  })
})
