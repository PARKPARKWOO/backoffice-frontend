import { ConnectorKillSwitchRefreshError } from './connectorKillSwitchOperation'

const responseOf = (error: unknown) => typeof error === 'object' && error !== null && 'response' in error
  ? (error as { response?: { status?: unknown; data?: { code?: unknown } } }).response
  : undefined

export const connectorPolicyErrorMessage = (error: unknown): string => {
  if (error instanceof ConnectorKillSwitchRefreshError) {
    if (error.mutationSucceeded) {
      return '변경 요청은 처리됐지만 최신 정책 상태를 확인하지 못했습니다. 다시 새로고침해 주세요.'
    }
    const mutationResponse = responseOf(error.mutationError)
    const mutationCode = typeof mutationResponse?.data?.code === 'string'
      ? mutationResponse.data.code
      : null
    if (mutationResponse?.status === 409 || mutationCode === 'CONNECTOR_KILL_SWITCH_VERSION_CONFLICT') {
      return '정책이 다른 요청으로 변경되었고 최신 상태도 확인하지 못했습니다. 다시 새로고침해 주세요.'
    }
    return 'Connector 정책 변경과 최신 상태 확인이 모두 실패했습니다. 다시 새로고침해 주세요.'
  }

  const response = responseOf(error)
  const code = typeof response?.data?.code === 'string' ? response.data.code : null
  if (response?.status === 409 || code === 'CONNECTOR_KILL_SWITCH_VERSION_CONFLICT') {
    return '정책이 다른 요청으로 변경되었습니다. 최신 상태를 다시 불러왔습니다.'
  }
  if (response?.status === 403) return '이 작업을 수행할 운영자 권한이 없습니다.'
  if (code === 'CONNECTOR_POLICY_INVALID') {
    return 'Connector 정책이 유효하지 않아 안전하게 차단되었습니다. 운영 정책을 확인해 주세요.'
  }
  if (code === 'OPERATOR_AUTH_NOT_CONFIGURED') {
    return '운영자 서비스 인증이 준비되지 않아 변경할 수 없습니다.'
  }
  if (response?.status === 503) return 'Connector 정책 서비스를 사용할 수 없습니다. 잠시 후 다시 확인해 주세요.'
  return 'Connector 정책을 변경하지 못했습니다. 최신 상태를 다시 확인해 주세요.'
}
