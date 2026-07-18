import type { ConnectorKillSwitch } from '../../types/resellConnectorPolicy'
import { hasCompleteConnectorPolicyRegistry } from './connectorPolicyRegistry'

export type ConnectorPolicySummary =
  | { state: 'UNKNOWN'; label: '정책 확인 중' | '정책 상태 확인 불가' }
  | { state: 'CLEAR'; label: '활성 차단 없음' }
  | { state: 'BLOCKED'; label: string }

export const summarizeConnectorPolicy = (
  switches: ConnectorKillSwitch[] | undefined,
  hasError: boolean,
): ConnectorPolicySummary => {
  if (hasError) return { state: 'UNKNOWN', label: '정책 상태 확인 불가' }
  if (switches === undefined) return { state: 'UNKNOWN', label: '정책 확인 중' }
  if (!hasCompleteConnectorPolicyRegistry(switches)) {
    return { state: 'UNKNOWN', label: '정책 상태 확인 불가' }
  }
  const activeCount = switches.filter((item) => item.active).length
  return activeCount > 0
    ? { state: 'BLOCKED', label: `${activeCount}개 차단 활성` }
    : { state: 'CLEAR', label: '활성 차단 없음' }
}
