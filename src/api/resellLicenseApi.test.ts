import { describe, expect, it } from 'vitest'
import { normalizeActivationSecretReceipt } from './resellLicenseApi'

describe('activation secret response normalization', () => {
  it('keeps only the one-time credential receipt fields', () => {
    const secret = `rsk_${'A'.repeat(43)}`
    const receipt = normalizeActivationSecretReceipt({
      data: {
        licenseUserId: 'park-resell',
        activationSecret: secret,
        rotatedAt: '2026-07-17T00:00:00Z',
        ownerId: 'must-not-leak',
      },
    }, 'park-resell')

    expect(receipt).toEqual({
      licenseUserId: 'park-resell',
      activationSecret: secret,
      rotatedAt: '2026-07-17T00:00:00Z',
    })
    expect(receipt).not.toHaveProperty('ownerId')
  })

  it('rejects malformed or shortened secrets', () => {
    expect(() => normalizeActivationSecretReceipt({
      licenseUserId: 'park-resell',
      activationSecret: 'rsk_short',
      rotatedAt: '2026-07-17T00:00:00Z',
    }, 'park-resell')).toThrow('활성화 키 응답 형식이 올바르지 않습니다.')
  })

  it('rejects a valid-looking receipt for another requested user', () => {
    expect(() => normalizeActivationSecretReceipt({
      licenseUserId: 'another-user',
      activationSecret: `rsk_${'A'.repeat(43)}`,
      rotatedAt: '2026-07-17T00:00:00Z',
    }, 'park-resell')).toThrow('활성화 키 응답 형식이 올바르지 않습니다.')
  })
})
