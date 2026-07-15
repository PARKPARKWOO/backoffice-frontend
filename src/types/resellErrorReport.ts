export type ErrorReportSeverity = 'ERROR' | 'FATAL'

export type ErrorReportCategory =
  | 'UNCAUGHT_EXCEPTION'
  | 'UNHANDLED_REJECTION'
  | 'RENDERER_PROCESS_GONE'
  | 'UNRESPONSIVE'
  | 'UNCLEAN_EXIT'

export type ErrorReportLifecyclePhase =
  | 'STARTUP'
  | 'PAIRING'
  | 'RUNTIME'
  | 'HEARTBEAT'
  | 'SHUTDOWN'
  | 'RENDERER'
  | 'UNKNOWN'

export interface ErrorReportMetadata {
  errorReportId: string
  clientReportId: string
  category: ErrorReportCategory
  severity: ErrorReportSeverity
  fingerprint: string
  lifecyclePhase: ErrorReportLifecyclePhase
  occurredAt: string
  receivedAt: string
  deviceId: string
  licenseUserId: string | null
  agentVersion: string
  releaseId: string
  diagnosticSchemaVersion: number
}

export interface ErrorReportList {
  reports: ErrorReportMetadata[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ErrorReportFilters {
  severity?: ErrorReportSeverity
  category?: ErrorReportCategory
  deviceId?: string
  licenseUserId?: string
  fingerprint?: string
}
