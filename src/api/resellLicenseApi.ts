import api from './axiosInstance'
import type {
  BackofficeLicense,
  IssueLicenseInput,
  LicenseFilters,
  LicenseList,
  LicenseUserList,
  LicenseUserSummary,
  RenewLicenseInput,
  RevokeLicenseInput,
} from '../types/resellLicense'

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

const normalizeLicenseUser = (value: unknown): LicenseUserSummary | null => {
  const record = asRecord(value)
  if (!record || typeof record.licenseUserId !== 'string') return null
  return {
    licenseUserId: record.licenseUserId,
    registeredAt: typeof record.registeredAt === 'string' ? record.registeredAt : null,
  }
}

const normalizeLicenseUsers = (value: unknown): LicenseUserList => {
  const payload = unwrapData(value)
  const record = asRecord(payload)
  let source: unknown[] = []
  if (Array.isArray(payload)) source = payload
  else if (Array.isArray(record?.items)) source = record.items
  else if (Array.isArray(record?.licenseUsers)) source = record.licenseUsers
  else if (Array.isArray(record?.users)) source = record.users
  else if (record?.licenseUserId) source = [record]
  const items = source.map(normalizeLicenseUser).filter((item): item is LicenseUserSummary => item !== null)
  return {
    items,
    page: typeof record?.page === 'number' ? record.page : 0,
    size: typeof record?.size === 'number' ? record.size : items.length,
    totalItems: typeof record?.totalElements === 'number'
      ? record.totalElements
      : typeof record?.totalItems === 'number' ? record.totalItems : items.length,
    totalPages: typeof record?.totalPages === 'number' ? record.totalPages : 1,
  }
}

const normalizeLicense = (value: unknown): BackofficeLicense => {
  const payload = unwrapData(value)
  const record = asRecord(payload)
  if (!record || typeof record.licenseId !== 'string' || typeof record.licenseUserId !== 'string') {
    throw new Error('라이선스 응답 형식이 올바르지 않습니다.')
  }
  return record as unknown as BackofficeLicense
}

const normalizeLicenses = (value: unknown): LicenseList => {
  const payload = unwrapData(value)
  const record = asRecord(payload)
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.licenses)
      ? record.licenses
      : []
  return { licenses: source.map(normalizeLicense) }
}

const commandHeaders = (revision?: number): Record<string, string> => ({
  'Idempotency-Key': crypto.randomUUID(),
  ...(revision === undefined ? {} : { 'If-Match': String(revision) }),
})

export const fetchLicenseUsers = async (licenseUserId?: string, page = 0, size = 20): Promise<LicenseUserList> => {
  const { data } = await api.get('/resell/license-users', {
    params: { licenseUserId: licenseUserId || undefined, page, size },
  })
  return normalizeLicenseUsers(data)
}

export const fetchResellLicenses = async (filters: LicenseFilters = {}): Promise<LicenseList> => {
  const { data } = await api.get('/resell/licenses', { params: filters })
  return normalizeLicenses(data)
}

export const fetchResellLicense = async (licenseId: string): Promise<BackofficeLicense> => {
  const { data } = await api.get(`/resell/licenses/${encodeURIComponent(licenseId)}`)
  return normalizeLicense(data)
}

export const issueResellLicense = async (body: IssueLicenseInput): Promise<BackofficeLicense> => {
  const { data } = await api.post('/resell/licenses', body, { headers: commandHeaders() })
  return normalizeLicense(data)
}

export const renewResellLicense = async (
  licenseId: string,
  revision: number,
  body: RenewLicenseInput,
): Promise<BackofficeLicense> => {
  const { data } = await api.post(
    `/resell/licenses/${encodeURIComponent(licenseId)}/renew`,
    body,
    { headers: commandHeaders(revision) },
  )
  return normalizeLicense(data)
}

export const revokeResellLicense = async (
  licenseId: string,
  revision: number,
  body: RevokeLicenseInput,
): Promise<BackofficeLicense> => {
  const { data } = await api.post(
    `/resell/licenses/${encodeURIComponent(licenseId)}/revoke`,
    body,
    { headers: commandHeaders(revision) },
  )
  return normalizeLicense(data)
}
