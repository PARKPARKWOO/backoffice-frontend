import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  fetchLicenseUsers,
  fetchResellLicenses,
  issueResellLicense,
  renewResellLicense,
  revokeResellLicense,
  rotateResellActivationSecret,
} from '../../api/resellLicenseApi'
import type {
  ActivationSecretReceipt,
  BackofficeLicense,
  IssueLicenseInput,
  LicensePlanType,
  LicenseStatus,
  LicenseUserSummary,
  RenewLicenseInput,
} from '../../types/resellLicense'
import {
  requiresFreshActivationRotation,
  shouldAcceptActivationRotationReceipt,
} from './activationRotationState'

type ListFilter = 'ALL' | 'UNLICENSED' | LicenseStatus
type EditorMode = 'ISSUE' | 'RENEW'

interface EditorTarget {
  mode: EditorMode
  user: LicenseUserSummary
  license: BackofficeLicense | null
}

interface LicenseFormState {
  planType: LicensePlanType
  productCode: string
  startsOn: string
  paidThrough: string
  durationDays: string
  gracePeriodDays: string
  maxDevices: string
  entitlements: string
  paymentReference: string
}

const planLabels: Record<LicensePlanType, string> = {
  TRIAL: '15일 무료 체험',
  SUBSCRIPTION: '구독제',
  FIXED_TERM: '단기 이용권',
}

const planDescriptions: Record<LicensePlanType, string> = {
  TRIAL: '15일 동안 전체 앱 기능과 지속 업데이트를 체험합니다.',
  SUBSCRIPTION: '결제 기간 동안 UI/API 변경에 대한 지속 업데이트를 제공합니다.',
  FIXED_TERM: '구매한 기간만 사용하며 지속적인 UI/API 변경 지원은 포함하지 않습니다.',
}

const statusLabels: Record<LicenseStatus, string> = {
  SCHEDULED: '사용 예정',
  ACTIVE: '사용 중',
  GRACE: '결제 유예',
  EXPIRED: '기간 만료',
  REVOKED: '사용 중지',
  MISSING: '미발급',
}

const statusStyles: Record<LicenseStatus, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  GRACE: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  EXPIRED: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  REVOKED: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  MISSING: 'bg-stone-100 text-stone-600 ring-stone-500/15',
}

const today = () => dayjs().format('YYYY-MM-DD')
const toStartInstant = (date: string) => `${date}T00:00:00+09:00`
const toEndInstant = (date: string) => `${date}T23:59:59+09:00`

const defaultProductCode = (planType: LicensePlanType) => ({
  TRIAL: 'RESELL_DESK_TRIAL',
  SUBSCRIPTION: 'RESELL_DESK_SUBSCRIPTION',
  FIXED_TERM: 'RESELL_DESK_FIXED_TERM',
}[planType])

const createForm = (planType: LicensePlanType, license: BackofficeLicense | null = null): LicenseFormState => {
  const futureExpiry = license && dayjs(license.expiresAt).isAfter(dayjs()) ? dayjs(license.expiresAt) : dayjs()
  const startsOn = license?.planType !== planType && futureExpiry.isAfter(dayjs())
    ? futureExpiry.add(1, 'day').format('YYYY-MM-DD')
    : today()
  return {
    planType,
    productCode: license?.planType === planType ? license.productCode : defaultProductCode(planType),
    startsOn,
    paidThrough: futureExpiry.add(30, 'day').format('YYYY-MM-DD'),
    durationDays: planType === 'TRIAL' ? '15' : '30',
    gracePeriodDays: planType === 'SUBSCRIPTION' ? '3' : '0',
    maxDevices: String(license?.maxDevices ?? 1),
    entitlements: (license?.entitlements.length ? license.entitlements : ['APP_ACCESS', 'ERP_CORE', 'IMPORT_VALIDATE']).join(', '),
    paymentReference: '',
  }
}

const statusPriority: Record<LicenseStatus, number> = {
  ACTIVE: 6,
  GRACE: 5,
  SCHEDULED: 4,
  EXPIRED: 3,
  REVOKED: 2,
  MISSING: 1,
}

const selectCurrentLicense = (licenses: BackofficeLicense[]): BackofficeLicense | null =>
  [...licenses].sort((a, b) => {
    const statusDelta = statusPriority[b.status] - statusPriority[a.status]
    return statusDelta || Date.parse(b.issuedAt) - Date.parse(a.issuedAt)
  })[0] ?? null

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
  : '—'

const errorMessage = (error: unknown) => {
  const response = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { data?: { message?: string } } }).response
    : undefined
  if (response?.data?.message) return response.data.message
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}

const errorCode = (error: unknown): string | null => {
  const response = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { data?: { code?: unknown } } }).response
    : undefined
  return typeof response?.data?.code === 'string' ? response.data.code : null
}

function StatusBadge({ status }: { status: LicenseStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  )
}

function LicensePeriod({ license }: { license: BackofficeLicense }) {
  return (
    <div className="text-sm text-slate-700">
      <p>{formatDate(license.startsAt)} — {formatDate(license.expiresAt)}</p>
      <p className="mt-1 text-xs text-slate-400">
        {license.daysRemaining > 0 ? `${license.daysRemaining}일 남음` : '사용 기간 종료'}
        {license.graceEndsAt ? ` · 유예 ${formatDate(license.graceEndsAt)}까지` : ''}
      </p>
    </div>
  )
}

export default function LicenseManagement() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [listFilter, setListFilter] = useState<ListFilter>('ALL')
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const [form, setForm] = useState<LicenseFormState>(() => createForm('TRIAL'))
  const [notice, setNotice] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<BackofficeLicense | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [rotationTarget, setRotationTarget] = useState<LicenseUserSummary | null>(null)
  const [rotationReason, setRotationReason] = useState('')
  const [rotationReceipt, setRotationReceipt] = useState<ActivationSecretReceipt | null>(null)
  const [rotationError, setRotationError] = useState<string | null>(null)
  const [rotationBusy, setRotationBusy] = useState(false)
  const [secretVisible, setSecretVisible] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)
  const [freshRotationRequired, setFreshRotationRequired] = useState(false)
  const [freshRotationConfirmed, setFreshRotationConfirmed] = useState(false)
  const [rotationSubmittedReason, setRotationSubmittedReason] = useState<string | null>(null)
  const rotationIdempotencyKey = useRef<string | null>(null)
  const rotationGeneration = useRef(0)
  const rotationInFlight = useRef(false)

  useEffect(() => {
    if (!rotationBusy && !rotationReceipt) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [rotationBusy, rotationReceipt])

  const usersQuery = useQuery({
    queryKey: ['resell-license-users', search, page],
    queryFn: () => fetchLicenseUsers(search || undefined, page, 20),
  })
  const licensesQuery = useQuery({
    queryKey: ['resell-licenses', search],
    queryFn: () => fetchResellLicenses({ licenseUserId: search || undefined }),
  })

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['resell-license-users'] }),
      queryClient.invalidateQueries({ queryKey: ['resell-licenses'] }),
    ])
  }

  const issueMutation = useMutation({
    mutationFn: issueResellLicense,
    onSuccess: async (license) => {
      setNotice(`${license.licenseUserId}에 ${planLabels[license.planType]} 라이선스를 발급했습니다.`)
      setEditor(null)
      await refresh()
    },
  })

  const renewMutation = useMutation({
    mutationFn: ({ license, body }: { license: BackofficeLicense; body: RenewLicenseInput }) =>
      renewResellLicense(license.licenseId, license.revision, body),
    onSuccess: async (license) => {
      setNotice(`${license.licenseUserId} 라이선스를 ${planLabels[license.planType]}로 갱신했습니다. 기존 licenseId가 유지됩니다.`)
      setEditor(null)
      await refresh()
    },
  })

  const revokeMutation = useMutation({
    mutationFn: ({ license, reason }: { license: BackofficeLicense; reason: string }) =>
      revokeResellLicense(license.licenseId, license.revision, { reason }),
    onSuccess: async (license) => {
      setNotice(`${license.licenseUserId} 라이선스를 중지했습니다.`)
      setRevokeTarget(null)
      setRevokeReason('')
      setEditor(null)
      await refresh()
    },
  })

  const licensesByUser = useMemo(() => {
    const grouped = new Map<string, BackofficeLicense[]>()
    for (const license of licensesQuery.data?.licenses ?? []) {
      grouped.set(license.licenseUserId, [...(grouped.get(license.licenseUserId) ?? []), license])
    }
    return grouped
  }, [licensesQuery.data])

  const rows = useMemo(() => (usersQuery.data?.items ?? []).map((user) => ({
    user,
    license: selectCurrentLicense(licensesByUser.get(user.licenseUserId) ?? []),
  })).filter(({ license }) => {
    if (listFilter === 'ALL') return true
    if (listFilter === 'UNLICENSED') return license === null
    return license?.status === listFilter
  }), [licensesByUser, listFilter, usersQuery.data])

  const totalUsers = usersQuery.data?.totalItems ?? 0
  const unlicensedCount = (usersQuery.data?.items ?? []).filter((user) => !licensesByUser.has(user.licenseUserId)).length
  const activeCount = (usersQuery.data?.items ?? []).filter((user) => {
    const current = selectCurrentLicense(licensesByUser.get(user.licenseUserId) ?? [])
    return current?.status === 'ACTIVE' || current?.status === 'GRACE'
  }).length

  const openIssue = (user: LicenseUserSummary) => {
    setNotice(null)
    setEditor({ mode: 'ISSUE', user, license: null })
    setForm(createForm('TRIAL'))
  }

  const openRenew = (user: LicenseUserSummary, license: BackofficeLicense) => {
    const planType: LicensePlanType = license.planType === 'TRIAL' ? 'SUBSCRIPTION' : license.planType
    setNotice(null)
    setEditor({ mode: 'RENEW', user, license })
    setForm(createForm(planType, license))
  }

  const openRotation = (user: LicenseUserSummary) => {
    if (rotationInFlight.current) return
    rotationGeneration.current += 1
    setNotice(null)
    setRotationTarget(user)
    setRotationReason('')
    setRotationReceipt(null)
    setRotationError(null)
    setSecretVisible(false)
    setSecretCopied(false)
    setFreshRotationRequired(false)
    setFreshRotationConfirmed(false)
    setRotationSubmittedReason(null)
    rotationIdempotencyKey.current = crypto.randomUUID()
  }

  const closeRotation = () => {
    if (rotationInFlight.current) return
    rotationGeneration.current += 1
    setRotationTarget(null)
    setRotationReason('')
    setRotationReceipt(null)
    setRotationError(null)
    setSecretVisible(false)
    setSecretCopied(false)
    setFreshRotationRequired(false)
    setFreshRotationConfirmed(false)
    setRotationSubmittedReason(null)
    rotationIdempotencyKey.current = null
  }

  const rotateActivationSecret = async (useFreshKey = false) => {
    const target = rotationTarget
    if (!target || rotationReason.trim().length < 4 || rotationInFlight.current) return
    if (useFreshKey && !freshRotationConfirmed) return

    const generation = rotationGeneration.current
    const submittedReason = rotationSubmittedReason ?? rotationReason.trim()
    const idempotencyKey = useFreshKey
      ? crypto.randomUUID()
      : rotationIdempotencyKey.current ?? crypto.randomUUID()
    rotationIdempotencyKey.current = idempotencyKey
    rotationInFlight.current = true
    setRotationSubmittedReason(submittedReason)
    setRotationBusy(true)
    setRotationError(null)
    if (useFreshKey) {
      setFreshRotationRequired(false)
      setFreshRotationConfirmed(false)
    }
    try {
      const receipt = await rotateResellActivationSecret(
        target.licenseUserId,
        { reason: submittedReason },
        idempotencyKey,
      )
      if (!shouldAcceptActivationRotationReceipt(
        rotationGeneration.current,
        generation,
        target.licenseUserId,
        receipt.licenseUserId,
      )) return
      setRotationReceipt(receipt)
      setFreshRotationRequired(false)
      setFreshRotationConfirmed(false)
    } catch (error) {
      if (rotationGeneration.current !== generation) return
      if (requiresFreshActivationRotation(errorCode(error))) {
        setFreshRotationRequired(true)
        setFreshRotationConfirmed(false)
        setRotationError('이전 재발급은 완료됐지만 일회성 키 응답을 복구할 수 없습니다.')
      } else {
        setRotationError(errorMessage(error))
      }
    } finally {
      rotationInFlight.current = false
      if (rotationGeneration.current === generation) setRotationBusy(false)
    }
  }

  const copyActivationSecret = async () => {
    if (!rotationReceipt) return
    try {
      await navigator.clipboard.writeText(rotationReceipt.activationSecret)
      setSecretCopied(true)
    } catch {
      setRotationError('클립보드에 복사하지 못했습니다. 키를 표시한 뒤 직접 복사해 주세요.')
    }
  }

  const availablePlans: LicensePlanType[] = editor?.mode === 'ISSUE'
    ? ['TRIAL', 'SUBSCRIPTION', 'FIXED_TERM']
    : editor?.license?.planType === 'TRIAL' || editor?.license?.status === 'EXPIRED'
      ? ['SUBSCRIPTION', 'FIXED_TERM']
      : [editor?.license?.planType ?? 'SUBSCRIPTION']

  const changePlan = (planType: LicensePlanType) => {
    setForm((current) => ({
      ...createForm(planType, editor?.license ?? null),
      maxDevices: current.maxDevices,
      entitlements: current.entitlements,
    }))
  }

  const entitlements = form.entitlements.split(',').map((item) => item.trim()).filter(Boolean)
  const maxDevices = Number(form.maxDevices)
  const durationDays = Number(form.durationDays)
  const gracePeriodDays = Number(form.gracePeriodDays)
  const isPaid = form.planType !== 'TRIAL'
  const isPlanTransition = editor?.mode === 'RENEW' && editor.license?.planType !== form.planType
  const sendsStartsAt = editor?.mode === 'ISSUE' ||
    isPlanTransition ||
    editor?.license?.planType === 'TRIAL' ||
    (editor?.license?.planType === 'FIXED_TERM' && editor.license.status === 'EXPIRED')
  const formValid = Boolean(
    editor &&
    editor.user.licenseUserId.length > 0 && editor.user.licenseUserId.length <= 32 &&
    form.startsOn &&
    Number.isInteger(maxDevices) && maxDevices >= 1 && maxDevices <= 100 &&
    entitlements.length > 0 &&
    (!isPaid || (form.paymentReference.trim().length > 0 && form.paymentReference.trim().length <= 100)) &&
    (form.planType !== 'SUBSCRIPTION' || form.paidThrough) &&
    (form.planType !== 'FIXED_TERM' || (Number.isInteger(durationDays) && durationDays >= 1))
  )

  const buildPayload = (): RenewLicenseInput => ({
    planType: form.planType,
    productCode: form.productCode.trim() || undefined,
    ...(sendsStartsAt && form.startsOn !== today() ? { startsAt: toStartInstant(form.startsOn) } : {}),
    ...(form.planType === 'SUBSCRIPTION' ? { paidThrough: toEndInstant(form.paidThrough) } : {}),
    ...(form.planType === 'FIXED_TERM' ? { durationDays } : {}),
    gracePeriodDays: form.planType === 'SUBSCRIPTION' && Number.isInteger(gracePeriodDays) ? gracePeriodDays : 0,
    maxDevices,
    entitlements,
    ...(isPaid ? { paymentReference: form.paymentReference.trim() } : {}),
  })

  const submit = () => {
    if (!editor || !formValid) return
    const payload = buildPayload()
    if (editor.mode === 'ISSUE') {
      const issuePayload: IssueLicenseInput = { licenseUserId: editor.user.licenseUserId, ...payload }
      issueMutation.mutate(issuePayload)
      return
    }
    if (editor.license) renewMutation.mutate({ license: editor.license, body: payload })
  }

  const isBusy = issueMutation.isPending || renewMutation.isPending
  const commandError = issueMutation.error ?? renewMutation.error
  const loading = usersQuery.isLoading || licensesQuery.isLoading
  const loadError = usersQuery.error ?? licensesQuery.error

  return (
    <div className="mx-auto max-w-[1440px] text-slate-900">
      <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Resell Ops</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">라이선스 관리</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            앱 사용자 ID에 1:1 라이선스를 발급하고, 결제 확인 후 같은 licenseId로 갱신하거나 상품을 전환합니다.
          </p>
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <div className="min-w-24 px-4 py-3"><p className="text-xs text-slate-400">조회 사용자</p><strong className="mt-1 block text-lg font-semibold">{totalUsers}</strong></div>
          <div className="min-w-24 border-l border-slate-100 px-4 py-3"><p className="text-xs text-slate-400">현재 페이지 사용 가능</p><strong className="mt-1 block text-lg font-semibold text-emerald-700">{activeCount}</strong></div>
          <div className="min-w-24 border-l border-slate-100 px-4 py-3"><p className="text-xs text-slate-400">현재 페이지 미발급</p><strong className="mt-1 block text-lg font-semibold text-amber-700">{unlicensedCount}</strong></div>
        </div>
      </div>

      {notice && (
        <div role="status" className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{notice}</span>
          <button className="text-xs font-medium text-emerald-700 hover:text-emerald-900" onClick={() => setNotice(null)}>닫기</button>
        </div>
      )}

      <div className={`grid gap-5 ${editor ? 'xl:grid-cols-[minmax(0,1fr)_390px]' : ''}`}>
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <form
              className="flex flex-col gap-3 lg:flex-row lg:items-center"
              onSubmit={(event) => {
                event.preventDefault()
                setSearch(searchInput.trim())
                setPage(0)
              }}
            >
              <label className="sr-only" htmlFor="license-user-search">앱 사용자 ID 검색</label>
              <div className="flex min-w-0 flex-1 rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-100">
                <span className="flex items-center pl-3 text-slate-400" aria-hidden="true">⌕</span>
                <input
                  id="license-user-search"
                  className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
                  placeholder="licenseUserId로 검색"
                  value={searchInput}
                  maxLength={32}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                {searchInput && <button type="button" className="px-3 text-xs text-slate-400 hover:text-slate-700" onClick={() => { setSearchInput(''); setSearch(''); setPage(0) }}>지우기</button>}
              </div>
              <button type="submit" className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">검색</button>
              <label className="sr-only" htmlFor="license-status-filter">상태 필터</label>
              <select
                id="license-status-filter"
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600 outline-none focus:border-slate-500"
                value={listFilter}
                onChange={(event) => setListFilter(event.target.value as ListFilter)}
              >
                <option value="ALL">전체 상태</option>
                <option value="UNLICENSED">미발급</option>
                <option value="ACTIVE">사용 중</option>
                <option value="SCHEDULED">사용 예정</option>
                <option value="GRACE">결제 유예</option>
                <option value="EXPIRED">기간 만료</option>
                <option value="REVOKED">사용 중지</option>
              </select>
            </form>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">라이선스 사용자를 불러오는 중입니다…</div>
          ) : loadError ? (
            <div className="p-12 text-center"><p className="text-sm font-medium text-rose-700">목록을 불러오지 못했습니다.</p><p className="mt-2 text-xs text-slate-400">{errorMessage(loadError)}</p></div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center"><p className="text-sm font-medium text-slate-700">조건에 맞는 사용자가 없습니다.</p><p className="mt-2 text-xs text-slate-400">앱에서 등록한 licenseUserId인지 확인해 주세요.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full border-collapse">
                <thead className="bg-slate-50/80 text-left text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">앱 사용자 ID</th>
                    <th className="px-5 py-3.5">상품 / 상태</th>
                    <th className="px-5 py-3.5">사용 기간</th>
                    <th className="px-5 py-3.5">업데이트 정책</th>
                    <th className="px-5 py-3.5 text-right">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ user, license }) => (
                    <tr key={user.licenseUserId} className="group hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-medium text-slate-800">{user.licenseUserId}</p>
                        <p className="mt-1 text-xs text-slate-400">등록 {formatDate(user.registeredAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        {license ? <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-slate-800">{planLabels[license.planType]}</span><StatusBadge status={license.status} /></div> : <StatusBadge status="MISSING" />}
                        {license && <p className="mt-1.5 font-mono text-[11px] text-slate-400">{license.licenseId}</p>}
                      </td>
                      <td className="px-5 py-4">{license ? <LicensePeriod license={license} /> : <span className="text-sm text-slate-400">발급 후 표시</span>}</td>
                      <td className="px-5 py-4">
                        {license ? (
                          <div><p className="text-sm font-medium text-slate-700">{license.updatePolicy === 'CONTINUOUS' ? '지속 업데이트' : '보안 업데이트만'}</p><p className="mt-1 text-xs text-slate-400">{license.accessMode === 'FULL' ? `전체 사용 · 최대 ${license.maxDevices}대` : '읽기 전용'}</p>{license.paymentReference?.startsWith('MIGRATED_WITHOUT_PAYMENT_PROOF:') ? <p className="mt-1 text-[11px] text-amber-700">이전 라이선스 · 입금 근거 미이관</p> : license.paymentReference && <p className="mt-1 text-[11px] text-emerald-600">입금 확인 참조 등록됨</p>}</div>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {license ? (
                            <>
                            {license.status !== 'REVOKED' && <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={() => openRenew(user, license)}>{license.planType === 'TRIAL' ? '유료 전환' : license.planType === 'FIXED_TERM' ? '재구매' : '갱신'}</button>}
                            {license.status !== 'REVOKED' && <button className="rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50" onClick={() => { setRevokeTarget(license); setRevokeReason('') }}>중지</button>}
                            </>
                          ) : <button className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800" onClick={() => openIssue(user)}>라이선스 발급</button>}
                          <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800" onClick={() => openRotation(user)}>키 재발급</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !loadError && (usersQuery.data?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-400">{(usersQuery.data?.page ?? page) + 1} / {usersQuery.data?.totalPages} 페이지</p>
              <div className="flex gap-2">
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>이전</button>
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40" disabled={page >= (usersQuery.data?.totalPages ?? 1) - 1} onClick={() => setPage((current) => current + 1)}>다음</button>
              </div>
            </div>
          )}
        </section>

        {editor && (
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30 xl:sticky xl:top-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{editor.mode === 'ISSUE' ? 'Issue' : 'Renew'}</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{editor.mode === 'ISSUE' ? '라이선스 발급' : editor.license?.planType === 'TRIAL' ? '무료 체험 전환' : editor.license?.planType === 'FIXED_TERM' ? '단기 이용권 재구매' : '구독 갱신'}</h3></div>
              <button aria-label="편집 닫기" className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEditor(null)}>×</button>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 px-3.5 py-3">
              <p className="text-xs text-slate-400">앱 사용자 ID</p><p className="mt-1 break-all font-mono text-sm font-medium text-slate-800">{editor.user.licenseUserId}</p>
              {editor.license && <p className="mt-2 text-xs text-slate-500">기존 <span className="font-mono">{editor.license.licenseId}</span> 유지</p>}
            </div>

            <div className="mt-5 space-y-4">
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">상품</span><select className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500" value={form.planType} onChange={(event) => changePlan(event.target.value as LicensePlanType)}>{availablePlans.map((plan) => <option key={plan} value={plan}>{planLabels[plan]}</option>)}</select><span className="mt-1.5 block text-xs leading-5 text-slate-400">{planDescriptions[form.planType]}</span>{editor.mode === 'RENEW' && editor.license?.planType !== 'TRIAL' && editor.license?.status !== 'EXPIRED' && <span className="mt-1 block text-xs leading-5 text-amber-600">사용 중인 유료 상품은 같은 상품만 갱신할 수 있습니다. 다른 유료 상품으로의 전환은 만료 후 가능합니다.</span>}{editor.mode === 'RENEW' && editor.license?.planType !== 'TRIAL' && editor.license?.status === 'EXPIRED' && <span className="mt-1 block text-xs leading-5 text-emerald-600">만료된 라이선스는 구독제 또는 단기 이용권으로 다시 시작할 수 있습니다.</span>}</label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">상품 코드</span><input className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500" value={form.productCode} maxLength={80} onChange={(event) => setForm({ ...form, productCode: event.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                {sendsStartsAt ? <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">시작일</span><input type="date" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500" value={form.startsOn} onChange={(event) => setForm({ ...form, startsOn: event.target.value })} /><span className="mt-1 block text-[11px] text-slate-400">오늘은 발급 시각부터 시작</span></label> : <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="block text-xs font-medium text-slate-500">기간 계산</span><span className="mt-1 block text-xs text-slate-400">현재 만료일에서 연장</span></div>}
                {form.planType === 'SUBSCRIPTION' ? <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">결제 완료 기간</span><input type="date" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500" value={form.paidThrough} onChange={(event) => setForm({ ...form, paidThrough: event.target.value })} /></label> : <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">이용 일수</span><input type="number" min={1} max={3650} disabled={form.planType === 'TRIAL'} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500" value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: event.target.value })} /></label>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">최대 장치</span><input type="number" min={1} max={100} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500" value={form.maxDevices} onChange={(event) => setForm({ ...form, maxDevices: event.target.value })} /></label>
                {form.planType === 'SUBSCRIPTION' ? <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">유예 일수</span><input type="number" min={0} max={30} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500" value={form.gracePeriodDays} onChange={(event) => setForm({ ...form, gracePeriodDays: event.target.value })} /></label> : <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="block text-xs font-medium text-slate-500">업데이트</span><span className="mt-1 block text-xs text-slate-400">{form.planType === 'TRIAL' ? '체험 기간 지속 업데이트' : '보안 업데이트만'}</span></div>}
              </div>
              {isPaid && <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">입금 확인 참조 <span className="text-rose-600">*</span></span><input className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500" placeholder="예: 주문번호 또는 내부 입금확인 번호" value={form.paymentReference} maxLength={100} onChange={(event) => setForm({ ...form, paymentReference: event.target.value })} /><span className="mt-1.5 block text-xs leading-5 text-slate-400">계좌번호, 입금자 개인정보 등 민감정보는 입력하지 마세요. 최대 100자입니다.</span></label>}
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-600">권한</span><textarea className="min-h-20 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" value={form.entitlements} onChange={(event) => setForm({ ...form, entitlements: event.target.value })} /><span className="mt-1 block text-xs text-slate-400">쉼표로 구분합니다.</span></label>
            </div>

            {commandError && <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{errorMessage(commandError)}</div>}
            <button className="mt-5 h-11 w-full rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40" disabled={!formValid || isBusy} onClick={submit}>{isBusy ? '처리 중…' : editor.mode === 'ISSUE' ? '라이선스 발급' : editor.license?.planType === 'TRIAL' ? '유료 상품으로 전환' : '같은 licenseId로 갱신'}</button>
          </aside>
        )}
      </div>

      {revokeTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="revoke-title">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Revoke license</p>
            <h3 id="revoke-title" className="mt-2 text-lg font-semibold text-slate-950">라이선스를 중지할까요?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500"><span className="font-mono text-slate-700">{revokeTarget.licenseUserId}</span>의 앱 자동화가 읽기 전용으로 전환됩니다. 이 작업은 감사 기록에 남습니다.</p>
            <label className="mt-5 block"><span className="mb-1.5 block text-xs font-medium text-slate-600">중지 사유 <span className="text-rose-600">*</span></span><textarea autoFocus className="min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-50" placeholder="내부 감사에 남길 사유를 입력하세요." value={revokeReason} maxLength={500} onChange={(event) => setRevokeReason(event.target.value)} /></label>
            {revokeMutation.error && <p className="mt-3 text-xs text-rose-700">{errorMessage(revokeMutation.error)}</p>}
            <div className="mt-5 flex justify-end gap-2"><button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setRevokeTarget(null); setRevokeReason('') }}>취소</button><button className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40" disabled={!revokeReason.trim() || revokeMutation.isPending} onClick={() => revokeMutation.mutate({ license: revokeTarget, reason: revokeReason.trim() })}>{revokeMutation.isPending ? '중지 중…' : '중지 확인'}</button></div>
          </div>
        </div>
      )}

      {rotationTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="rotation-title">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">Rotate activation credential</p>
            <h3 id="rotation-title" className="mt-2 text-lg font-semibold text-slate-950">
              {rotationReceipt ? '새 활성화 키가 발급되었습니다' : '활성화 키를 재발급할까요?'}
            </h3>
            {rotationReceipt ? (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-500">이 키는 다시 조회할 수 없습니다. 고객에게 안전한 채널로 전달한 뒤 창을 닫아 주세요. 기존 키와 웹 세션은 더 이상 사용할 수 없습니다.</p>
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">{rotationReceipt.licenseUserId}의 새 활성화 키</span>
                  <input
                    className="h-11 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm outline-none focus:border-slate-500"
                    type={secretVisible ? 'text' : 'password'}
                    value={rotationReceipt.activationSecret}
                    readOnly
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setSecretVisible((value) => !value)}>{secretVisible ? '키 숨기기' : '키 표시'}</button>
                  <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" onClick={() => void copyActivationSecret()}>{secretCopied ? '복사됨' : '클립보드에 복사'}</button>
                </div>
                <p className="mt-3 text-xs leading-5 text-amber-700">클립보드와 화면 공유 기록에도 키가 남을 수 있습니다. 전달 후 클립보드를 다른 값으로 덮어쓰세요.</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-500"><span className="font-mono text-slate-700">{rotationTarget.licenseUserId}</span>의 기존 활성화 키, 웹 세션과 아직 사용하지 않은 페어링을 폐기합니다. 고객 장치가 이미 페어링되어 있다면 장치키는 유지됩니다.</p>
                <label className="mt-5 block"><span className="mb-1.5 block text-xs font-medium text-slate-600">재발급 사유 <span className="text-rose-600">*</span></span><textarea autoFocus className="min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500" placeholder="분실, 노출 의심, 고객 복구 요청 등 감사 사유를 입력하세요." value={rotationReason} minLength={4} maxLength={200} disabled={rotationSubmittedReason !== null || rotationBusy} onChange={(event) => setRotationReason(event.target.value)} /></label>
                {rotationSubmittedReason && <p className="mt-2 text-xs leading-5 text-slate-400">안전한 재시도를 위해 첫 요청의 사유와 idempotency key를 유지합니다. 사유를 바꾸려면 이 창을 닫고 새 작업을 시작하세요.</p>}
              </>
            )}
            {rotationError && <p className="mt-3 text-xs text-rose-700">{rotationError}</p>}
            {freshRotationRequired && !rotationReceipt && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                <p>같은 요청 키로는 이미 발급된 키를 다시 조회할 수 없습니다. 아래 작업은 확인하지 못한 키를 한 번 더 폐기하고 완전히 새로운 키를 발급합니다.</p>
                <label className="mt-3 flex items-start gap-2 font-medium">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={freshRotationConfirmed}
                    disabled={rotationBusy}
                    onChange={(event) => setFreshRotationConfirmed(event.target.checked)}
                  />
                  새 idempotency key로 두 번째 재발급을 실행함을 확인합니다.
                </label>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={rotationBusy}
                onClick={closeRotation}
              >
                {rotationBusy ? '응답 대기 중…' : rotationReceipt ? '확인 후 닫기' : '취소'}
              </button>
              {!rotationReceipt && !freshRotationRequired && (
                <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40" disabled={rotationReason.trim().length < 4 || rotationBusy} onClick={() => void rotateActivationSecret()}>{rotationBusy ? '재발급 중…' : '기존 키 폐기 후 재발급'}</button>
              )}
              {!rotationReceipt && freshRotationRequired && (
                <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40" disabled={!freshRotationConfirmed || rotationBusy} onClick={() => void rotateActivationSecret(true)}>{rotationBusy ? '다시 재발급 중…' : '확인하고 새 키 재발급'}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
