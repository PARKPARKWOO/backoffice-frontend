import api from './axiosInstance'
import type {
  ResolveSupportMessageInput,
  SupportMessageDetail,
  SupportMessageList,
  SupportMessageStatus,
} from '../types/resellSupport'

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

const normalizeDetail = (value: unknown): SupportMessageDetail => {
  const record = asRecord(unwrapData(value))
  if (!record || typeof record.supportMessageId !== 'string' || typeof record.message !== 'string') {
    throw new Error('문의 응답 형식이 올바르지 않습니다.')
  }
  return record as unknown as SupportMessageDetail
}

const normalizeList = (value: unknown): SupportMessageList => {
  const record = asRecord(unwrapData(value))
  const messages = Array.isArray(record?.messages) ? record.messages : []
  return {
    messages: messages as SupportMessageList['messages'],
    page: typeof record?.page === 'number' ? record.page : 0,
    size: typeof record?.size === 'number' ? record.size : messages.length,
    totalElements: typeof record?.totalElements === 'number' ? record.totalElements : messages.length,
    totalPages: typeof record?.totalPages === 'number' ? record.totalPages : (messages.length ? 1 : 0),
  }
}

export const fetchSupportMessages = async (params: {
  page?: number
  size?: number
  status?: SupportMessageStatus
  licenseUserId?: string
} = {}): Promise<SupportMessageList> => {
  const { data } = await api.get('/resell/support-messages', { params })
  return normalizeList(data)
}

export const fetchSupportMessage = async (supportMessageId: string): Promise<SupportMessageDetail> => {
  const { data } = await api.get(`/resell/support-messages/${encodeURIComponent(supportMessageId)}`)
  return normalizeDetail(data)
}
export const resolveSupportMessage = async (
  supportMessageId: string,
  revision: number,
  body: ResolveSupportMessageInput,
): Promise<SupportMessageDetail> => {
  const { data } = await api.post(
    `/resell/support-messages/${encodeURIComponent(supportMessageId)}/resolve`,
    body,
    {
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
        'If-Match': String(revision),
      },
    },
  )
  return normalizeDetail(data)
}
