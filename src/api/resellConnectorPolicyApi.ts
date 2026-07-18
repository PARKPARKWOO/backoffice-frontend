import api from './axiosInstance'
import type {
  ConnectorKillSwitch,
  ConnectorKillSwitchList,
  UpdateConnectorKillSwitchInput,
} from '../types/resellConnectorPolicy'
import {
  hasCompleteConnectorPolicyRegistry,
  isConnectorPolicyRegistryMember,
  isFixedConnectorPolicySwitchId,
} from '../pages/resell/connectorPolicyRegistry'

const RESPONSE_ERROR = 'Connector 정책 응답 형식이 올바르지 않습니다.'
const SWITCH_FIELDS = new Set([
  'switchId',
  'scopeType',
  'connectorId',
  'capabilityId',
  'active',
  'reasonCode',
  'revision',
  'activatedAt',
  'deactivatedAt',
  'updatedAt',
  'updatedBy',
])
const LIST_FIELDS = new Set(['effectivePolicyDigest', 'switches'])
const SUCCESS_ENVELOPE_FIELDS = new Set(['success', 'data'])
const SHA256 = /^sha256:[0-9a-f]{64}$/
const SWITCH_ID = /^[a-z][a-z0-9-]{2,99}$/
const CONNECTOR_ID = /^[a-z][a-z0-9-]{0,79}$/
const CAPABILITY_ID = /^[a-z][a-z0-9.-]{2,99}$/
const REASON_CODE = /^[A-Z][A-Z0-9_]{2,79}$/
const ACTOR_ID = /^[A-Za-z0-9._:-]{1,128}$/

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null

const hasExactFields = (record: Record<string, unknown>, fields: Set<string>): boolean => {
  const keys = Object.keys(record)
  return keys.length === fields.size && keys.every((key) => fields.has(key))
}

const exactPayloadRecord = (value: unknown, fields: Set<string>): Record<string, unknown> => {
  const record = asRecord(value)
  if (!record || !hasExactFields(record, SUCCESS_ENVELOPE_FIELDS) || record.success !== true) {
    throw new Error(RESPONSE_ERROR)
  }
  const data = asRecord(record.data)
  if (!data || !hasExactFields(data, fields)) throw new Error(RESPONSE_ERROR)
  return data
}

const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 16 && value.length <= 40 && Number.isFinite(Date.parse(value))

const isNullableTimestamp = (value: unknown): value is string | null => value === null || isTimestamp(value)

const normalizeConnectorKillSwitchItem = (record: Record<string, unknown>): ConnectorKillSwitch => {
  if (!hasExactFields(record, SWITCH_FIELDS)) throw new Error(RESPONSE_ERROR)
  const scopeType = record.scopeType
  const capabilityId = record.capabilityId
  if (
    typeof record.switchId !== 'string' || !SWITCH_ID.test(record.switchId) ||
    (scopeType !== 'CONNECTOR' && scopeType !== 'CAPABILITY') ||
    typeof record.connectorId !== 'string' || !CONNECTOR_ID.test(record.connectorId) ||
    typeof record.active !== 'boolean' ||
    (record.reasonCode !== null && (typeof record.reasonCode !== 'string' || !REASON_CODE.test(record.reasonCode))) ||
    (record.active === true && record.reasonCode === null) ||
    !Number.isSafeInteger(record.revision) || (record.revision as number) < 0 ||
    !isNullableTimestamp(record.activatedAt) ||
    !isNullableTimestamp(record.deactivatedAt) ||
    !isTimestamp(record.updatedAt) ||
    typeof record.updatedBy !== 'string' || !ACTOR_ID.test(record.updatedBy) ||
    (scopeType === 'CONNECTOR' ? capabilityId !== null : typeof capabilityId !== 'string' || !CAPABILITY_ID.test(capabilityId))
  ) throw new Error(RESPONSE_ERROR)

  const normalized: ConnectorKillSwitch = {
    switchId: record.switchId,
    scopeType,
    connectorId: record.connectorId,
    capabilityId: capabilityId as string | null,
    active: record.active,
    reasonCode: record.reasonCode as string | null,
    revision: record.revision as number,
    activatedAt: record.activatedAt,
    deactivatedAt: record.deactivatedAt,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  }
  if (!isConnectorPolicyRegistryMember(normalized)) throw new Error(RESPONSE_ERROR)
  return normalized
}

export const normalizeConnectorKillSwitch = (value: unknown): ConnectorKillSwitch =>
  normalizeConnectorKillSwitchItem(exactPayloadRecord(value, SWITCH_FIELDS))

export const normalizeConnectorKillSwitchList = (value: unknown): ConnectorKillSwitchList => {
  const record = exactPayloadRecord(value, LIST_FIELDS)
  if (
    typeof record.effectivePolicyDigest !== 'string' || !SHA256.test(record.effectivePolicyDigest) ||
    !Array.isArray(record.switches) || record.switches.length > 100
  ) throw new Error(RESPONSE_ERROR)
  const switches = record.switches.map((item) => {
    const itemRecord = asRecord(item)
    if (!itemRecord) throw new Error(RESPONSE_ERROR)
    return normalizeConnectorKillSwitchItem(itemRecord)
  })
  if (!hasCompleteConnectorPolicyRegistry(switches)) throw new Error(RESPONSE_ERROR)
  return { effectivePolicyDigest: record.effectivePolicyDigest, switches }
}

export const fetchConnectorKillSwitches = async (signal?: AbortSignal): Promise<ConnectorKillSwitchList> => {
  const { data } = await api.get('/resell/connector-kill-switches', { signal })
  return normalizeConnectorKillSwitchList(data)
}

export const updateConnectorKillSwitch = async (
  input: UpdateConnectorKillSwitchInput,
): Promise<ConnectorKillSwitch> => {
  if (
    !SWITCH_ID.test(input.switchId) || !isFixedConnectorPolicySwitchId(input.switchId) ||
    !Number.isSafeInteger(input.revision) || input.revision < 0 ||
    !REASON_CODE.test(input.reasonCode)
  ) throw new Error('Connector 정책 변경 요청 형식이 올바르지 않습니다.')

  const { data } = await api.post(
    `/resell/connector-kill-switches/${encodeURIComponent(input.switchId)}`,
    { active: input.active, reasonCode: input.reasonCode },
    {
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
        'If-Match': String(input.revision),
      },
    },
  )
  const updated = normalizeConnectorKillSwitch(data)
  if (
    updated.switchId !== input.switchId ||
    updated.active !== input.active ||
    updated.revision <= input.revision
  ) throw new Error(RESPONSE_ERROR)
  return updated
}
