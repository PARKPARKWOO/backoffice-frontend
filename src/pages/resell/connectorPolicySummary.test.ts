import { describe, expect, it } from 'vitest'
import type { ConnectorKillSwitch } from '../../types/resellConnectorPolicy'
import { summarizeConnectorPolicy } from './connectorPolicySummary'

const inactiveSwitch: ConnectorKillSwitch = {
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
const completeRegistry: ConnectorKillSwitch[] = [
  inactiveSwitch,
  {
    ...inactiveSwitch,
    switchId: 'kream-order-file-validate-local',
    scopeType: 'CAPABILITY',
    capabilityId: 'order.file.validate.local',
  },
  {
    ...inactiveSwitch,
    switchId: 'kream-settlement-file-validate-local',
    scopeType: 'CAPABILITY',
    capabilityId: 'settlement.file.validate.local',
  },
]

describe('connector policy safety summary', () => {
  it('never presents a missing or failed policy response as clear', () => {
    expect(summarizeConnectorPolicy(undefined, false)).toEqual({
      state: 'UNKNOWN',
      label: '정책 확인 중',
    })
    expect(summarizeConnectorPolicy(undefined, true)).toEqual({
      state: 'UNKNOWN',
      label: '정책 상태 확인 불가',
    })
    expect(summarizeConnectorPolicy([], false)).toEqual({
      state: 'UNKNOWN',
      label: '정책 상태 확인 불가',
    })
    expect(summarizeConnectorPolicy([inactiveSwitch], false)).toEqual({
      state: 'UNKNOWN',
      label: '정책 상태 확인 불가',
    })
  })

  it('reports clear only from a successfully loaded policy and counts active blocks', () => {
    expect(summarizeConnectorPolicy(completeRegistry, false)).toEqual({
      state: 'CLEAR',
      label: '활성 차단 없음',
    })
    expect(summarizeConnectorPolicy([
      { ...inactiveSwitch, active: true },
      ...completeRegistry.slice(1),
    ], false)).toEqual({
      state: 'BLOCKED',
      label: '1개 차단 활성',
    })
  })
})
