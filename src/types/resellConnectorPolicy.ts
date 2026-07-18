export type ConnectorKillSwitchScope = 'CONNECTOR' | 'CAPABILITY'

export interface ConnectorKillSwitch {
  switchId: string
  scopeType: ConnectorKillSwitchScope
  connectorId: string
  capabilityId: string | null
  active: boolean
  reasonCode: string | null
  revision: number
  activatedAt: string | null
  deactivatedAt: string | null
  updatedAt: string
  updatedBy: string
}

export interface ConnectorKillSwitchList {
  effectivePolicyDigest: string
  switches: ConnectorKillSwitch[]
}

export interface UpdateConnectorKillSwitchInput {
  switchId: string
  revision: number
  active: boolean
  reasonCode: string
}
