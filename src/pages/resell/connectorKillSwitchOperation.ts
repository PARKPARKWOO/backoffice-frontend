import type {
  ConnectorKillSwitch,
  ConnectorKillSwitchList,
  UpdateConnectorKillSwitchInput,
} from '../../types/resellConnectorPolicy'

const REASON_CODE = /^[A-Z][A-Z0-9_]{2,79}$/

interface ChangeOptions {
  current: ConnectorKillSwitch
  desiredActive: boolean
  reasonCode: string
  confirmActivation: () => boolean | Promise<boolean>
  mutate: (input: UpdateConnectorKillSwitchInput) => Promise<ConnectorKillSwitch>
  refetch: () => Promise<ConnectorKillSwitchList>
}

export type ConnectorKillSwitchChangeResult =
  | { status: 'CANCELLED' }
  | { status: 'UPDATED'; switch: ConnectorKillSwitch }

export class ConnectorKillSwitchRefreshError extends Error {
  constructor(
    readonly mutationError: unknown | null,
    readonly mutationSucceeded: boolean,
  ) {
    super('Connector policy refresh failed after a mutation attempt.')
    this.name = 'ConnectorKillSwitchRefreshError'
  }
}

export async function executeConnectorKillSwitchChange(
  options: ChangeOptions,
): Promise<ConnectorKillSwitchChangeResult> {
  const reasonCode = options.reasonCode.trim()
  if (!REASON_CODE.test(reasonCode)) throw new Error('변경 사유를 선택해 주세요.')
  if (options.desiredActive && !await options.confirmActivation()) return { status: 'CANCELLED' }

  let mutationFailed = false
  let mutationError: unknown = null
  let updated: ConnectorKillSwitch | null = null
  try {
    updated = await options.mutate({
      switchId: options.current.switchId,
      revision: options.current.revision,
      active: options.desiredActive,
      reasonCode,
    })
    if (
      updated.switchId !== options.current.switchId ||
      updated.active !== options.desiredActive ||
      updated.revision <= options.current.revision
    ) throw new Error('Connector policy mutation result did not match the request.')
  } catch (error) {
    mutationFailed = true
    mutationError = error
  }
  let refreshed: ConnectorKillSwitchList
  try {
    refreshed = await options.refetch()
  } catch {
    throw new ConnectorKillSwitchRefreshError(
      mutationFailed ? mutationError : null,
      !mutationFailed,
    )
  }
  if (mutationFailed) throw mutationError
  if (updated === null) throw new Error('Connector policy mutation returned no result.')
  const confirmed = refreshed.switches.find((item) => item.switchId === options.current.switchId)
  if (
    !confirmed ||
    confirmed.active !== options.desiredActive ||
    confirmed.revision < updated.revision
  ) throw new ConnectorKillSwitchRefreshError(null, true)
  return { status: 'UPDATED', switch: updated }
}
