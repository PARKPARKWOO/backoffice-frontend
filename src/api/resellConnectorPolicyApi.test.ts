import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './axiosInstance'
import {
  normalizeConnectorKillSwitch,
  normalizeConnectorKillSwitchList,
  updateConnectorKillSwitch,
} from './resellConnectorPolicyApi'

vi.mock('./axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const digest = `sha256:${'a'.repeat(64)}`
const connectorSwitch = {
  switchId: 'kream-all',
  scopeType: 'CONNECTOR',
  connectorId: 'kream',
  capabilityId: null,
  active: false,
  reasonCode: null,
  revision: 0,
  activatedAt: null,
  deactivatedAt: null,
  updatedAt: '2026-07-18T00:00:00Z',
  updatedBy: 'SYSTEM',
}
const fixedSwitches = [
  connectorSwitch,
  {
    ...connectorSwitch,
    switchId: 'kream-order-file-validate-local',
    scopeType: 'CAPABILITY',
    capabilityId: 'order.file.validate.local',
  },
  {
    ...connectorSwitch,
    switchId: 'kream-settlement-file-validate-local',
    scopeType: 'CAPABILITY',
    capabilityId: 'settlement.file.validate.local',
  },
]

describe('connector kill-switch response normalization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('accepts only the exact bounded list contract', () => {
    expect(normalizeConnectorKillSwitchList({
      success: true,
      data: { effectivePolicyDigest: digest, switches: fixedSwitches },
    })).toEqual({ effectivePolicyDigest: digest, switches: fixedSwitches })
  })

  it('rejects ambiguous envelopes and wrapped switch items', () => {
    const payload = { effectivePolicyDigest: digest, switches: fixedSwitches }

    expect(() => normalizeConnectorKillSwitchList(payload))
      .toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
    expect(() => normalizeConnectorKillSwitchList({ success: false, data: payload }))
      .toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
    expect(() => normalizeConnectorKillSwitchList({ success: true, debug: 'leak', data: payload }))
      .toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
    expect(() => normalizeConnectorKillSwitchList({
      effectivePolicyDigest: digest,
      switches: [{ success: true, data: connectorSwitch }, ...fixedSwitches.slice(1)],
    })).toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
  })

  it('fails closed on malformed, inconsistent, or extended switch data', () => {
    expect(() => normalizeConnectorKillSwitchList({
      success: true,
      data: {
        effectivePolicyDigest: digest,
        switches: [{ ...connectorSwitch, active: 'false' }],
      },
    })).toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
    expect(() => normalizeConnectorKillSwitch({
      success: true,
      data: { ...connectorSwitch, scopeType: 'CAPABILITY', capabilityId: null },
    })).toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
    expect(() => normalizeConnectorKillSwitch({
      success: true,
      data: { ...connectorSwitch, rawAudit: 'must-not-survive' },
    })).toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
    expect(() => normalizeConnectorKillSwitchList({
      success: true,
      data: { effectivePolicyDigest: digest, switches: fixedSwitches.slice(0, 2) },
    })).toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
  })

  it('accepts only the fixed connector policy registry', () => {
    expect(normalizeConnectorKillSwitch({ success: true, data: fixedSwitches[1] })).toEqual(fixedSwitches[1])
    expect(() => normalizeConnectorKillSwitch({
      success: true,
      data: { ...connectorSwitch, switchId: '1kream-all' },
    })).toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
    expect(() => normalizeConnectorKillSwitch({
      success: true,
      data: { ...connectorSwitch, connectorId: 'kream.primary' },
    })).toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
    expect(() => normalizeConnectorKillSwitch({
      success: true,
      data: {
        ...connectorSwitch,
        switchId: `a${'b'.repeat(99)}`,
        connectorId: `a${'b'.repeat(79)}`,
      },
    })).toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
  })

  it('sends a UUID command key and current revision without optimistic state arguments', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { ...connectorSwitch, active: true, reasonCode: 'INCIDENT_RESPONSE', revision: 1 } } })

    await updateConnectorKillSwitch({
      switchId: 'kream-all',
      revision: 0,
      active: true,
      reasonCode: 'INCIDENT_RESPONSE',
    })

    const [, body, config] = vi.mocked(api.post).mock.calls[0]
    expect(body).toEqual({ active: true, reasonCode: 'INCIDENT_RESPONSE' })
    expect(config).toMatchObject({ headers: { 'If-Match': '0' } })
    expect((config as { headers: Record<string, string> }).headers['Idempotency-Key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('rejects a mutation response for another switch or state', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        success: true,
        data: { ...fixedSwitches[1], active: false, revision: 1 },
      },
    })

    await expect(updateConnectorKillSwitch({
      switchId: 'kream-all',
      revision: 0,
      active: true,
      reasonCode: 'INCIDENT_RESPONSE',
    })).rejects.toThrow('Connector 정책 응답 형식이 올바르지 않습니다.')
  })
})
