import { describe, expect, it } from 'vitest'
import { ConnectorKillSwitchRefreshError } from './connectorKillSwitchOperation'
import { connectorPolicyErrorMessage } from './connectorPolicyErrorMessage'

const conflict = {
  response: {
    status: 409,
    data: { code: 'CONNECTOR_KILL_SWITCH_VERSION_CONFLICT' },
  },
}

describe('connector policy operator error message', () => {
  it('does not claim a conflict was refreshed when the refresh also failed', () => {
    expect(connectorPolicyErrorMessage(
      new ConnectorKillSwitchRefreshError(conflict, false),
    )).toBe('정책이 다른 요청으로 변경되었고 최신 상태도 확인하지 못했습니다. 다시 새로고침해 주세요.')
  })

  it('distinguishes a committed mutation whose authoritative refresh failed', () => {
    expect(connectorPolicyErrorMessage(
      new ConnectorKillSwitchRefreshError(null, true),
    )).toBe('변경 요청은 처리됐지만 최신 정책 상태를 확인하지 못했습니다. 다시 새로고침해 주세요.')
  })

  it('distinguishes invalid connector policy from operator authentication readiness', () => {
    expect(connectorPolicyErrorMessage({
      response: { status: 503, data: { code: 'CONNECTOR_POLICY_INVALID' } },
    })).toBe('Connector 정책이 유효하지 않아 안전하게 차단되었습니다. 운영 정책을 확인해 주세요.')

    expect(connectorPolicyErrorMessage({
      response: { status: 503, data: { code: 'OPERATOR_AUTH_NOT_CONFIGURED' } },
    })).toBe('운영자 서비스 인증이 준비되지 않아 변경할 수 없습니다.')
  })
})
