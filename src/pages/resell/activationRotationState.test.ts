import { describe, expect, it } from 'vitest'
import {
  requiresFreshActivationRotation,
  shouldAcceptActivationRotationReceipt,
} from './activationRotationState'

describe('activation rotation operation state', () => {
  it('rejects stale or cross-user one-time receipts', () => {
    expect(shouldAcceptActivationRotationReceipt(4, 4, 'park-resell', 'park-resell')).toBe(true)
    expect(shouldAcceptActivationRotationReceipt(5, 4, 'park-resell', 'park-resell')).toBe(false)
    expect(shouldAcceptActivationRotationReceipt(4, 4, 'park-resell', 'another-user')).toBe(false)
  })

  it('requires a confirmed fresh key only after a completed rotation replay', () => {
    expect(requiresFreshActivationRotation('ACTIVATION_SECRET_ALREADY_ROTATED')).toBe(true)
    expect(requiresFreshActivationRotation('RESELL_UPSTREAM_UNAVAILABLE')).toBe(false)
    expect(requiresFreshActivationRotation(null)).toBe(false)
  })
})
