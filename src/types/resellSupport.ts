export type SupportMessageCategory = 'BILLING' | 'LICENSE' | 'TECHNICAL' | 'OTHER'
export type SupportMessageStatus = 'OPEN' | 'RESOLVED'

export interface SupportMessageSummary {
  supportMessageId: string
  category: SupportMessageCategory
  status: SupportMessageStatus
  licenseUserId: string | null
  deviceId: string
  receivedAt: string
  resolvedAt: string | null
}

export interface SupportMessageDetail extends SupportMessageSummary {
  message: string
  resolvedBy: string | null
  resolveReason: string | null
  resolutionNote: string | null
  revision: number
}

export interface SupportMessageList {
  messages: SupportMessageSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ResolveSupportMessageInput {
  reason: string
  resolutionNote?: string
}
