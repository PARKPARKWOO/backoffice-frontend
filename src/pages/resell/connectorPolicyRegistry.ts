import type { ConnectorKillSwitch } from '../../types/resellConnectorPolicy'

const FIXED_KREAM_SWITCHES: Record<string, Pick<ConnectorKillSwitch, 'scopeType' | 'connectorId' | 'capabilityId'>> = {
  'kream-all': {
    scopeType: 'CONNECTOR',
    connectorId: 'kream',
    capabilityId: null,
  },
  'kream-order-file-validate-local': {
    scopeType: 'CAPABILITY',
    connectorId: 'kream',
    capabilityId: 'order.file.validate.local',
  },
  'kream-settlement-file-validate-local': {
    scopeType: 'CAPABILITY',
    connectorId: 'kream',
    capabilityId: 'settlement.file.validate.local',
  },
}

export const isFixedConnectorPolicySwitchId = (switchId: string): boolean =>
  Object.prototype.hasOwnProperty.call(FIXED_KREAM_SWITCHES, switchId)

export const isConnectorPolicyRegistryMember = (item: ConnectorKillSwitch): boolean => {
  const expected = FIXED_KREAM_SWITCHES[item.switchId]
  return Boolean(expected) &&
    item.scopeType === expected.scopeType &&
    item.connectorId === expected.connectorId &&
    item.capabilityId === expected.capabilityId
}

export const hasCompleteConnectorPolicyRegistry = (switches: ConnectorKillSwitch[]): boolean => {
  if (switches.length !== Object.keys(FIXED_KREAM_SWITCHES).length) return false
  const seen = new Set<string>()
  return switches.every((item) => {
    if (!isConnectorPolicyRegistryMember(item) || seen.has(item.switchId)) return false
    seen.add(item.switchId)
    return true
  })
}
