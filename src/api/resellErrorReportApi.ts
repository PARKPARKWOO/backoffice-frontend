import api from './axiosInstance'
import type {
  ErrorReportCategory,
  ErrorReportFilters,
  ErrorReportLifecyclePhase,
  ErrorReportList,
  ErrorReportMetadata,
  ErrorReportSeverity,
} from '../types/resellErrorReport'

const severities = new Set<ErrorReportSeverity>(['ERROR', 'FATAL'])
const categories = new Set<ErrorReportCategory>([
  'UNCAUGHT_EXCEPTION',
  'UNHANDLED_REJECTION',
  'RENDERER_PROCESS_GONE',
  'UNRESPONSIVE',
  'UNCLEAN_EXIT',
])
const lifecyclePhases = new Set<ErrorReportLifecyclePhase>([
  'STARTUP',
  'PAIRING',
  'RUNTIME',
  'HEARTBEAT',
  'SHUTDOWN',
  'RENDERER',
  'UNKNOWN',
])

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null

const unwrapData = (value: unknown): unknown => {
  let current = value
  for (let depth = 0; depth < 2; depth += 1) {
    const record = asRecord(current)
    if (!record || !('data' in record)) break
    current = record.data
  }
  return current
}

const requiredString = (record: Record<string, unknown>, field: string): string => {
  const value = record[field]
  if (typeof value !== 'string' || !value) throw new Error('오류 리포트 응답 형식이 올바르지 않습니다.')
  return value
}

export const normalizeErrorReportMetadata = (value: unknown): ErrorReportMetadata => {
  const record = asRecord(unwrapData(value))
  if (!record) throw new Error('오류 리포트 응답 형식이 올바르지 않습니다.')

  const severity = requiredString(record, 'severity') as ErrorReportSeverity
  const category = requiredString(record, 'category') as ErrorReportCategory
  const lifecyclePhase = requiredString(record, 'lifecyclePhase') as ErrorReportLifecyclePhase
  const diagnosticSchemaVersion = record.diagnosticSchemaVersion
  if (!severities.has(severity) || !categories.has(category) || !lifecyclePhases.has(lifecyclePhase)
    || typeof diagnosticSchemaVersion !== 'number') {
    throw new Error('오류 리포트 응답 형식이 올바르지 않습니다.')
  }

  return {
    errorReportId: requiredString(record, 'errorReportId'),
    clientReportId: requiredString(record, 'clientReportId'),
    category,
    severity,
    fingerprint: requiredString(record, 'fingerprint'),
    lifecyclePhase,
    occurredAt: requiredString(record, 'occurredAt'),
    receivedAt: requiredString(record, 'receivedAt'),
    deviceId: requiredString(record, 'deviceId'),
    licenseUserId: typeof record.licenseUserId === 'string' ? record.licenseUserId : null,
    agentVersion: requiredString(record, 'agentVersion'),
    releaseId: requiredString(record, 'releaseId'),
    diagnosticSchemaVersion,
  }
}

export const normalizeErrorReportList = (value: unknown): ErrorReportList => {
  const record = asRecord(unwrapData(value))
  if (!record || !Array.isArray(record.reports)) {
    throw new Error('오류 리포트 목록 응답 형식이 올바르지 않습니다.')
  }
  const reports = record.reports.map(normalizeErrorReportMetadata)
  return {
    reports,
    page: typeof record.page === 'number' ? record.page : 0,
    size: typeof record.size === 'number' ? record.size : reports.length,
    totalElements: typeof record.totalElements === 'number' ? record.totalElements : reports.length,
    totalPages: typeof record.totalPages === 'number' ? record.totalPages : (reports.length ? 1 : 0),
  }
}

export const fetchErrorReports = async (
  filters: ErrorReportFilters & { page?: number; size?: number } = {},
): Promise<ErrorReportList> => {
  const { data } = await api.get('/resell/error-reports', { params: filters })
  return normalizeErrorReportList(data)
}

export const fetchErrorReport = async (errorReportId: string): Promise<ErrorReportMetadata> => {
  const { data } = await api.get(`/resell/error-reports/${encodeURIComponent(errorReportId)}`)
  return normalizeErrorReportMetadata(data)
}
