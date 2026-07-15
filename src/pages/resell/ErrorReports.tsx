import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchErrorReport, fetchErrorReports } from '../../api/resellErrorReportApi'
import type {
  ErrorReportCategory,
  ErrorReportFilters,
  ErrorReportLifecyclePhase,
  ErrorReportMetadata,
  ErrorReportSeverity,
} from '../../types/resellErrorReport'

const categoryLabels: Record<ErrorReportCategory, string> = {
  UNCAUGHT_EXCEPTION: '처리되지 않은 예외',
  UNHANDLED_REJECTION: '처리되지 않은 비동기 오류',
  RENDERER_PROCESS_GONE: '화면 프로세스 종료',
  UNRESPONSIVE: '앱 응답 없음',
  UNCLEAN_EXIT: '비정상 종료',
}

const phaseLabels: Record<ErrorReportLifecyclePhase, string> = {
  STARTUP: '시작',
  PAIRING: '장치 연결',
  RUNTIME: '실행 중',
  HEARTBEAT: '상태 보고',
  SHUTDOWN: '종료',
  RENDERER: '화면',
  UNKNOWN: '확인 불가',
}

const categories = Object.keys(categoryLabels) as ErrorReportCategory[]
const fingerprintPattern = /^sha256:[0-9a-f]{64}$/
const deviceIdPattern = /^[A-Za-z0-9_-]+$/
const licenseUserIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{3,31}$/

const formatDate = (value: string) => dayjs(value).format('YYYY. MM. DD. HH:mm:ss')

const errorMessage = (error: unknown) => {
  const response = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { data?: { message?: string } } }).response
    : undefined
  return response?.data?.message ?? (error instanceof Error ? error.message : '요청을 처리하지 못했습니다.')
}

const emptyDraft = {
  severity: 'ALL',
  category: 'ALL',
  deviceId: '',
  licenseUserId: '',
  fingerprint: '',
}

type FilterDraft = typeof emptyDraft

function SeverityBadge({ severity }: { severity: ErrorReportSeverity }) {
  const style = severity === 'FATAL'
    ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
    : 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}>{severity}</span>
}

function MetadataRow({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`min-w-0 break-all text-xs text-slate-700 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

export default function ErrorReports() {
  const navigate = useNavigate()
  const { errorReportId } = useParams()
  const [page, setPage] = useState(0)
  const [draft, setDraft] = useState<FilterDraft>(emptyDraft)
  const [filters, setFilters] = useState<ErrorReportFilters>({})
  const [filterError, setFilterError] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['resell-error-reports', page, filters],
    queryFn: () => fetchErrorReports({ ...filters, page, size: 20 }),
  })

  const detailQuery = useQuery({
    queryKey: ['resell-error-report', errorReportId],
    queryFn: () => fetchErrorReport(errorReportId!),
    enabled: Boolean(errorReportId),
    gcTime: 0,
  })

  const reports = listQuery.data?.reports ?? []
  const totalElements = listQuery.data?.totalElements ?? 0
  const totalPages = listQuery.data?.totalPages ?? 0
  const fatalCount = useMemo(() => reports.filter((report) => report.severity === 'FATAL').length, [reports])

  const applyFilters = () => {
    const deviceId = draft.deviceId.trim()
    const licenseUserId = draft.licenseUserId.trim().toLowerCase()
    const fingerprint = draft.fingerprint.trim().toLowerCase()
    if (deviceId && (deviceId.length > 36 || !deviceIdPattern.test(deviceId))) {
      setFilterError('장치 ID는 36자 이하의 영문, 숫자, `_`, `-`만 입력할 수 있습니다.')
      return
    }
    if (licenseUserId && !licenseUserIdPattern.test(licenseUserId)) {
      setFilterError('licenseUserId는 4~32자의 영문, 숫자, `.`, `_`, `-` 형식이어야 합니다.')
      return
    }
    if (fingerprint && !fingerprintPattern.test(fingerprint)) {
      setFilterError('fingerprint 전체 값(sha256: + 소문자 64자리)을 입력해 주세요.')
      return
    }
    setFilterError(null)
    setPage(0)
    setFilters({
      severity: draft.severity === 'ALL' ? undefined : draft.severity as ErrorReportSeverity,
      category: draft.category === 'ALL' ? undefined : draft.category as ErrorReportCategory,
      deviceId: deviceId || undefined,
      licenseUserId: licenseUserId || undefined,
      fingerprint: fingerprint || undefined,
    })
    navigate('/resell/error-reports')
  }

  const clearFilters = () => {
    setDraft(emptyDraft)
    setFilters({})
    setFilterError(null)
    setPage(0)
    navigate('/resell/error-reports')
  }

  const filterByFingerprint = (report: ErrorReportMetadata) => {
    const nextDraft = { ...emptyDraft, fingerprint: report.fingerprint }
    setDraft(nextDraft)
    setFilters({ fingerprint: report.fingerprint })
    setFilterError(null)
    setPage(0)
    navigate('/resell/error-reports')
  }

  return (
    <div className="mx-auto max-w-[1480px] text-slate-900">
      <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Resell Ops</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">오류 리포트</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Agent가 전송한 개인정보를 최소화한 진단 메타데이터만 확인합니다. 원문 메시지·stack·log·파일 경로는 수집하거나 표시하지 않습니다.
          </p>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <div className="min-w-28 px-4 py-3"><p className="text-xs text-slate-400">조회 결과</p><strong className="mt-1 block text-lg font-semibold">{totalElements}</strong></div>
          <div className="min-w-28 border-l border-slate-100 px-4 py-3"><p className="text-xs text-slate-400">현재 페이지 FATAL</p><strong className="mt-1 block text-lg font-semibold text-rose-700">{fatalCount}</strong></div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5">
        <form className="grid gap-3 lg:grid-cols-5" onSubmit={(event) => { event.preventDefault(); applyFilters() }}>
          <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" value={draft.severity} onChange={(event) => setDraft((value) => ({ ...value, severity: event.target.value }))}>
            <option value="ALL">모든 심각도</option><option value="FATAL">FATAL</option><option value="ERROR">ERROR</option>
          </select>
          <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" value={draft.category} onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))}>
            <option value="ALL">모든 분류</option>{categories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
          </select>
          <input className="h-10 rounded-lg border border-slate-300 px-3 font-mono text-sm" placeholder="deviceId exact" value={draft.deviceId} maxLength={36} onChange={(event) => setDraft((value) => ({ ...value, deviceId: event.target.value }))} />
          <input className="h-10 rounded-lg border border-slate-300 px-3 font-mono text-sm" placeholder="licenseUserId exact" value={draft.licenseUserId} maxLength={32} onChange={(event) => setDraft((value) => ({ ...value, licenseUserId: event.target.value }))} />
          <div className="flex gap-2"><button className="h-10 flex-1 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">조회</button><button type="button" className="h-10 rounded-lg border border-slate-300 px-3 text-xs text-slate-600" onClick={clearFilters}>초기화</button></div>
          <input className="h-10 rounded-lg border border-slate-300 px-3 font-mono text-xs lg:col-span-5" placeholder="fingerprint exact · sha256:…" value={draft.fingerprint} maxLength={71} onChange={(event) => setDraft((value) => ({ ...value, fingerprint: event.target.value }))} />
        </form>
        {filterError && <p className="mt-3 text-xs text-rose-700">{filterError}</p>}
      </div>

      <div className={`grid gap-5 ${errorReportId ? 'xl:grid-cols-[minmax(0,1fr)_440px]' : ''}`}>
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          {listQuery.isLoading ? <div className="p-14 text-center text-sm text-slate-400">오류 리포트를 불러오는 중입니다…</div>
            : listQuery.error ? <div className="p-14 text-center text-sm text-rose-700">{errorMessage(listQuery.error)}</div>
              : reports.length === 0 ? <div className="p-14 text-center"><p className="text-sm font-medium text-slate-700">조건에 맞는 오류 리포트가 없습니다.</p><p className="mt-2 text-xs text-slate-400">Agent에서 메타데이터가 접수되면 여기에 표시됩니다.</p></div>
                : <div className="divide-y divide-slate-100">{reports.map((report) => (
                  <div key={report.errorReportId} role="button" tabIndex={0} className={`grid cursor-pointer gap-3 px-5 py-4 hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_220px_auto] ${errorReportId === report.errorReportId ? 'bg-slate-50' : ''}`} onClick={() => navigate(`/resell/error-reports/${encodeURIComponent(report.errorReportId)}`)} onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/resell/error-reports/${encodeURIComponent(report.errorReportId)}`) }}>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={report.severity} /><strong className="text-sm font-medium text-slate-800">{categoryLabels[report.category]}</strong><span className="text-xs text-slate-400">{phaseLabels[report.lifecyclePhase]}</span></div><p className="mt-2 truncate font-mono text-xs text-slate-500">{report.licenseUserId ?? 'licenseUserId 미등록'} · {report.deviceId}</p><p className="mt-1 text-[11px] text-slate-400">Agent {report.agentVersion} · {report.releaseId}</p></div>
                    <button className="min-w-0 self-center rounded-lg bg-slate-50 px-3 py-2 text-left font-mono text-[11px] text-indigo-700 hover:bg-indigo-50" title="동일 fingerprint만 조회" onClick={(event) => { event.stopPropagation(); filterByFingerprint(report) }}><span className="block text-[10px] text-slate-400">동일 오류 필터</span><span className="block truncate">{report.fingerprint}</span></button>
                    <time className="text-xs text-slate-400">{formatDate(report.receivedAt)}</time>
                  </div>
                ))}</div>}
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>{totalPages ? `${page + 1} / ${totalPages} 페이지` : '0 페이지'}</span><div className="flex gap-2"><button className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40" disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>이전</button><button className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>다음</button></div></div>
        </section>

        {errorReportId && <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30 xl:sticky xl:top-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Metadata detail</p><h3 className="mt-1 text-lg font-semibold text-slate-950">오류 리포트 상세</h3></div><button className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-500" onClick={() => navigate('/resell/error-reports')}>닫기</button></div>
          {detailQuery.isLoading ? <div className="py-16 text-center text-sm text-slate-400">상세 메타데이터를 불러오는 중입니다…</div>
            : detailQuery.error ? <div className="py-16 text-center text-sm text-rose-700">{errorMessage(detailQuery.error)}</div>
              : detailQuery.data && <div className="mt-5"><div className="flex items-center justify-between"><SeverityBadge severity={detailQuery.data.severity} /><span className="text-xs text-slate-400">{categoryLabels[detailQuery.data.category]}</span></div><dl className="mt-4 rounded-xl bg-slate-50 px-4"><MetadataRow label="오류 ID" value={detailQuery.data.errorReportId} mono /><MetadataRow label="클라이언트 ID" value={detailQuery.data.clientReportId} mono /><MetadataRow label="사용자 ID" value={detailQuery.data.licenseUserId ?? '미등록'} mono /><MetadataRow label="장치 ID" value={detailQuery.data.deviceId} mono /><MetadataRow label="단계" value={phaseLabels[detailQuery.data.lifecyclePhase]} /><MetadataRow label="발생 시각" value={formatDate(detailQuery.data.occurredAt)} /><MetadataRow label="수신 시각" value={formatDate(detailQuery.data.receivedAt)} /><MetadataRow label="Agent 버전" value={detailQuery.data.agentVersion} mono /><MetadataRow label="Release ID" value={detailQuery.data.releaseId} mono /><MetadataRow label="진단 schema" value={detailQuery.data.diagnosticSchemaVersion} /></dl><button className="mt-4 w-full rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-left" onClick={() => filterByFingerprint(detailQuery.data!)}><span className="text-xs font-medium text-indigo-800">동일 fingerprint만 조회</span><span className="mt-1 block break-all font-mono text-[11px] text-indigo-700">{detailQuery.data.fingerprint}</span></button><div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">Telegram outbox에도 같은 최소 메타데이터만 적재됩니다. 실제 발송 worker는 별도 배포가 필요하며, 원문 오류 메시지·stack·log·로컬 경로는 포함하지 않습니다.</div></div>}
        </aside>}
      </div>
    </div>
  )
}
