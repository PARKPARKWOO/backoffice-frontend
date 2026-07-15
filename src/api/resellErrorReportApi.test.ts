import { describe, expect, it } from 'vitest'
import { normalizeErrorReportList, normalizeErrorReportMetadata } from './resellErrorReportApi'

const fingerprint = `sha256:${'a'.repeat(64)}`

const upstreamReport = {
  errorReportId: 'err_123',
  clientReportId: '6c141a93-3aa0-47bc-bafb-909a34676a61',
  category: 'UNCAUGHT_EXCEPTION',
  severity: 'FATAL',
  fingerprint,
  lifecyclePhase: 'RUNTIME',
  occurredAt: '2026-07-15T01:00:00Z',
  receivedAt: '2026-07-15T01:00:01Z',
  deviceId: 'device-123',
  licenseUserId: 'license-user',
  agentVersion: '1.4.0',
  releaseId: 'agent-1.4.0-macos-arm64',
  diagnosticSchemaVersion: 1,
  ownerId: 'private-owner',
  runtimeId: 'private-runtime',
  message: 'must not survive normalization',
  stack: 'must not survive normalization',
  log: 'must not survive normalization',
  path: '/private/path',
}

describe('error report response normalization', () => {
  it('returns only explicitly allowed metadata fields', () => {
    const report = normalizeErrorReportMetadata({ data: upstreamReport })

    expect(report).toEqual({
      errorReportId: 'err_123',
      clientReportId: '6c141a93-3aa0-47bc-bafb-909a34676a61',
      category: 'UNCAUGHT_EXCEPTION',
      severity: 'FATAL',
      fingerprint,
      lifecyclePhase: 'RUNTIME',
      occurredAt: '2026-07-15T01:00:00Z',
      receivedAt: '2026-07-15T01:00:01Z',
      deviceId: 'device-123',
      licenseUserId: 'license-user',
      agentVersion: '1.4.0',
      releaseId: 'agent-1.4.0-macos-arm64',
      diagnosticSchemaVersion: 1,
    })
    for (const sensitiveField of ['ownerId', 'runtimeId', 'message', 'stack', 'log', 'path']) {
      expect(report).not.toHaveProperty(sensitiveField)
    }
  })

  it('normalizes paginated reports without retaining diagnostics', () => {
    const result = normalizeErrorReportList({
      data: {
        reports: [upstreamReport],
        page: 2,
        size: 20,
        totalElements: 43,
        totalPages: 3,
      },
    })

    expect(result.page).toBe(2)
    expect(result.totalElements).toBe(43)
    expect(result.reports[0]).not.toHaveProperty('message')
  })

  it('rejects unsupported metadata contracts', () => {
    expect(() => normalizeErrorReportMetadata({ ...upstreamReport, severity: 'DEBUG' })).toThrow(
      '오류 리포트 응답 형식이 올바르지 않습니다.',
    )
  })
})
