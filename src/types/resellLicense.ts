export type LicensePlanType = 'TRIAL' | 'SUBSCRIPTION' | 'FIXED_TERM'
export type LicenseStatus = 'SCHEDULED' | 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'REVOKED' | 'MISSING'
export type LicenseAccessMode = 'FULL' | 'READ_ONLY'
export type LicenseUpdatePolicy = 'CONTINUOUS' | 'SECURITY_ONLY'

export interface LicenseUserSummary {
  licenseUserId: string
  registeredAt: string | null
}

export interface LicenseUserList {
  items: LicenseUserSummary[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface BackofficeLicense {
  licenseId: string
  licenseUserId: string
  productCode: string
  planType: LicensePlanType
  status: LicenseStatus
  accessMode: LicenseAccessMode
  updatePolicy: LicenseUpdatePolicy
  startsAt: string
  expiresAt: string
  updateEntitledUntil: string
  graceEndsAt: string | null
  daysRemaining: number
  maxDevices: number
  entitlements: string[]
  paymentReference: string | null
  issuedAt: string
  renewedAt: string | null
  revokedAt: string | null
  revokeReason: string | null
  revision: number
}

export interface LicenseList {
  licenses: BackofficeLicense[]
}

export interface IssueLicenseInput {
  licenseUserId: string
  planType: LicensePlanType
  productCode?: string
  startsAt?: string
  paidThrough?: string
  durationDays?: number
  gracePeriodDays?: number
  maxDevices?: number
  entitlements?: string[]
  paymentReference?: string
}

export type RenewLicenseInput = Omit<IssueLicenseInput, 'licenseUserId'>

export interface RevokeLicenseInput {
  reason: string
}

export interface RotateActivationSecretInput {
  reason: string
}

export interface ActivationSecretReceipt {
  licenseUserId: string
  activationSecret: string
  rotatedAt: string
}

export interface LicenseFilters {
  licenseUserId?: string
  planType?: LicensePlanType
  status?: LicenseStatus
}
